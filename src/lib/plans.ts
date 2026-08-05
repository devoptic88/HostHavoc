import { db } from "@/lib/db";
import { GAMES, type Game } from "@/content/games";
import { VPS_PLANS, DEDICATED_PLANS } from "@/content/plans";
import { gamePlanName, gameResources, priceForTier } from "@/lib/gamePricing";
import type { Plan, PlanTier, ProductType } from "@prisma/client";

export { tierLabel, priceForTier, gameResources } from "@/lib/gamePricing";

export type LiveGamePlanOption = {
  id: string;
  name: string;
  slots: number;
  priceMonthly: number;
  tier: PlanTier;
  ramMb: number;
  databases: number;
  backups: number;
  diskMb: number;
};

/**
 * Find or lazily create the DB Plan row for a configuration. Egg mapping is
 * inherited from any existing plan for the same game so admins only map once.
 * Every game supports both tiers this way — LITE just applies a price
 * discount and a save slot, no separate catalog entry is required.
 */
export async function resolveGamePlan(
  game: Game,
  units: number,
  tier: PlanTier = "PRO",
): Promise<Plan> {
  if (!game.slotOptions.includes(units)) {
    throw new Error("Invalid configuration");
  }
  const name = gamePlanName(game, units, tier);
  const existing = await db.plan.findFirst({
    where: { productType: "GAME_SERVER", gameSlug: game.slug, name },
  });
  if (existing) return existing;

  const sibling = await db.plan.findFirst({
    where: { productType: "GAME_SERVER", gameSlug: game.slug, eggId: { not: null } },
  });
  const res = gameResources(game, units);
  return db.plan.create({
    data: {
      productType: "GAME_SERVER",
      gameSlug: game.slug,
      name,
      slots: units,
      ramMb: res.ramMb,
      cpuPercent: res.cpuPercent,
      diskMb: res.diskMb,
      tier,
      deploySlots: 1,
      saveSlots: tier === "LITE" ? 2 : 0,
      priceMonthly: priceForTier(game, units, tier),
      eggId: sibling?.eggId ?? null,
      nestId: sibling?.nestId ?? null,
    },
  });
}

export async function resolveExistingGamePlan(game: Game, planId: string): Promise<Plan> {
  const plan = await db.plan.findFirst({
    where: {
      id: planId,
      productType: "GAME_SERVER",
      gameSlug: game.slug,
      active: true,
    },
  });
  if (!plan) throw new Error("Unknown plan");
  return plan;
}

export async function listGamePlanOptions(gameSlug: string): Promise<LiveGamePlanOption[]> {
  const plans = await db.plan.findMany({
    where: {
      productType: "GAME_SERVER",
      gameSlug,
      active: true,
      slots: { not: null },
    },
    orderBy: [{ sortOrder: "asc" }, { slots: "asc" }, { priceMonthly: "asc" }],
  });

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slots: plan.slots ?? 0,
    priceMonthly: Number(plan.priceMonthly),
    tier: plan.tier,
    ramMb: plan.ramMb,
    databases: plan.databases,
    backups: plan.backups,
    diskMb: plan.diskMb,
  }));
}

export async function resolveFixedPlan(
  productType: Extract<ProductType, "VPS" | "DEDICATED">,
  planId: string,
): Promise<Plan> {
  const source =
    productType === "VPS"
      ? VPS_PLANS.find((p) => p.id === planId)
      : DEDICATED_PLANS.find((p) => p.id === planId);
  if (!source) throw new Error("Unknown plan");
  if ("soldOut" in source && source.soldOut) throw new Error("Plan is sold out");

  const name = productType === "VPS" ? (source as (typeof VPS_PLANS)[number]).name : (source as (typeof DEDICATED_PLANS)[number]).cpu;
  const existing = await db.plan.findFirst({ where: { productType, name } });
  if (existing) return existing;

  return db.plan.create({
    data: {
      productType,
      name,
      ramMb: 0,
      cpuPercent: 0,
      diskMb: 0,
      priceMonthly: source.price,
    },
  });
}

export function gameBySlug(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}
