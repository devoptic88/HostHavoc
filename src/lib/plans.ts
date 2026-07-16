import { db } from "@/lib/db";
import { GAMES, priceFor, type Game } from "@/content/games";
import { VPS_PLANS, DEDICATED_PLANS } from "@/content/plans";
import type { Plan, ProductType } from "@prisma/client";

/** Resource heuristics for game plans — editable later in Admin → Plans. */
export function gameResources(game: Game, units: number) {
  const ramMb =
    game.pricingUnit === "gb"
      ? units * 1024
      : Math.min(16384, Math.max(3072, Math.round(units * 160)));
  return {
    ramMb,
    cpuPercent: Math.min(400, Math.max(200, Math.round(ramMb / 24))),
    diskMb: Math.min(81920, ramMb * 4),
  };
}

function planName(game: Game, units: number) {
  return `${game.name} — ${units} ${game.pricingUnit === "gb" ? "GB" : "slots"}`;
}

/**
 * Find or lazily create the DB Plan row for a configuration. Egg mapping is
 * inherited from any existing plan for the same game so admins only map once.
 */
export async function resolveGamePlan(game: Game, units: number): Promise<Plan> {
  if (!game.slotOptions.includes(units)) {
    throw new Error("Invalid configuration");
  }
  const name = planName(game, units);
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
      priceMonthly: priceFor(game, units),
      eggId: sibling?.eggId ?? null,
      nestId: sibling?.nestId ?? null,
    },
  });
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
