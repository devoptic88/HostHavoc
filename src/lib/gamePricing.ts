import { priceFor, type Game } from "@/content/games";
import type { PlanTier } from "@prisma/client";

/**
 * Pure pricing/resource helpers shared between server code (checkout, plan
 * creation) and the client-side game configurator. No `db` import here on
 * purpose — this module is safe to bundle into the browser.
 */

/**
 * LITE trades always-on for a lower price, matching the reference panel's
 * roughly 40% discount on its budget "wake & play" tier.
 */
const LITE_PRICE_MULTIPLIER = 0.6;

export function tierLabel(tier: PlanTier) {
  return tier === "LITE" ? "Wake & Play Server" : "24/7 Server";
}

/** Display price for a not-yet-created units-based plan at a given tier. */
export function priceForTier(game: Game, units: number, tier: PlanTier) {
  const price = priceFor(game, units);
  return tier === "LITE" ? Math.round(price * LITE_PRICE_MULTIPLIER * 100) / 100 : price;
}

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

export function gamePlanName(game: Game, units: number, tier: PlanTier) {
  const unitLabel = `${units} ${game.pricingUnit === "gb" ? "GB" : "slots"}`;
  return tier === "LITE" ? `${game.name} — ${unitLabel} Lite` : `${game.name} — ${unitLabel}`;
}
