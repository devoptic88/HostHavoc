"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Moon, Rocket, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Game } from "@/content/games";
import { gameResources, priceForTier } from "@/lib/gamePricing";
import type { DisplayLocation } from "@/lib/locations";
import type { LiveGamePlanOption } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";

const TIER_COPY: Record<
  PlanTier,
  { label: string; subtitle: string; bullets: string[] }
> = {
  LITE: {
    label: "LITE",
    subtitle: "Budget - Wake & play Server",
    bullets: ["Online when you are", "Shuts down when unused", "Wake & play to resume"],
  },
  PRO: {
    label: "PRO",
    subtitle: "Premium - 24/7 Server",
    bullets: ["24/7, always online", "Static IP Address", "Set automated tasks"],
  },
};

function formatMb(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)}GB` : `${mb}MB`;
}

export function GameConfigurator({
  game,
  locations,
  plans = [],
}: {
  game: Game;
  locations: DisplayLocation[];
  plans?: LiveGamePlanOption[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [tier, setTier] = useState<PlanTier>("PRO");

  const plansForTier = useMemo(
    () => plans.filter((plan) => plan.tier === tier),
    [plans, tier],
  );
  const hasLivePlans = plansForTier.length > 0;

  const [units, setUnits] = useState(game.defaultSlots);
  const [selectedPlanId, setSelectedPlanId] = useState(plansForTier[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id);
  const unitLabel = game.pricingUnit === "gb" ? "GB RAM" : "Player Slots";

  const selectedPlan = hasLivePlans
    ? plansForTier.find((plan) => plan.id === selectedPlanId) ?? plansForTier[0]
    : null;

  const price = selectedPlan ? selectedPlan.priceMonthly : priceForTier(game, units, tier);
  const specs = selectedPlan
    ? {
        ramMb: selectedPlan.ramMb,
        diskMb: selectedPlan.diskMb,
        databases: selectedPlan.databases,
        backups: selectedPlan.backups,
      }
    : { ...gameResources(game, units), databases: 1, backups: 2 };

  const selectedStyle = {
    borderColor: `${game.accent}99`,
    background: `${game.accent}1F`,
    boxShadow: `0 0 14px ${game.accent}40`,
  };

  function pickTier(next: PlanTier) {
    setTier(next);
    const nextPlans = plans.filter((plan) => plan.tier === next);
    setSelectedPlanId(nextPlans[0]?.id ?? "");
  }

  function deploy() {
    const params = new URLSearchParams({
      game: game.slug,
      tier,
      location: String(locationId ?? ""),
    });
    if (hasLivePlans && selectedPlanId) {
      params.set("plan", selectedPlanId);
    } else {
      params.set("units", String(units));
    }
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="glass-strong rounded-2xl p-6 shadow-card">
      <h3 className="font-display text-sm font-bold uppercase tracking-widest text-steel-dim">
        Configure your server
      </h3>

      {/* Tier — every game offers both, matching the reference panel's Lite/Pro split */}
      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-steel-faint">
        Features
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(["LITE", "PRO"] as const).map((option) => {
          const copy = TIER_COPY[option];
          const selected = tier === option;
          const Icon = option === "LITE" ? Moon : Sparkles;
          return (
            <motion.button
              key={option}
              onClick={() => pickTier(option)}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              className={cn(
                "ring-focus flex flex-col rounded-xl border p-3 text-left transition-all",
                selected
                  ? "text-white"
                  : "border-white/10 bg-night-100 text-steel-dim hover:border-white/25 hover:text-white",
              )}
              style={selected ? selectedStyle : undefined}
            >
              <span
                className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider"
                style={{ color: selected ? game.accent : undefined }}
              >
                <Icon className="h-3.5 w-3.5" /> {copy.label}
              </span>
              <span className="mt-1 text-sm font-bold text-white">{copy.subtitle}</span>
              <ul className="mt-2 space-y-1">
                {copy.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-1.5 text-[11px] text-steel-dim">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-steel-faint" /> {bullet}
                  </li>
                ))}
              </ul>
              {selected && (
                <span
                  className="mt-3 inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: game.accent }}
                >
                  <Check className="h-3 w-3" /> Selected
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-steel-faint">
        {hasLivePlans ? "Performance" : unitLabel}
      </p>
      {hasLivePlans ? (
        <div className="space-y-2">
          {plansForTier.map((plan) => {
            const selected = plan.id === selectedPlanId;
            return (
              <motion.button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                className={cn(
                  "ring-focus flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                  selected
                    ? "text-white"
                    : "border-white/10 bg-night-100 text-steel-dim hover:border-white/25 hover:text-white",
                )}
                style={selected ? selectedStyle : undefined}
              >
                <div>
                  <p className="text-sm font-bold text-white">{plan.name}</p>
                  <p className="mt-1 text-xs text-steel-dim">
                    {plan.slots} {game.pricingUnit === "gb" ? "GB RAM" : "player slots"}
                  </p>
                </div>
                <p className="text-sm font-bold text-white">${plan.priceMonthly.toFixed(2)}/mo</p>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {game.slotOptions.map((s) => (
            <motion.button
              key={s}
              onClick={() => setUnits(s)}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              className={cn(
                "ring-focus min-w-[52px] rounded-lg border px-3 py-2 text-sm font-bold transition-all",
                units === s
                  ? "text-white"
                  : "border-white/10 bg-night-100 text-steel-dim hover:border-white/25 hover:text-white",
              )}
              style={units === s ? selectedStyle : undefined}
            >
              {s}
            </motion.button>
          ))}
        </div>
      )}

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-steel-faint">
        Server Location
      </p>
      <div className="flex flex-wrap gap-2">
        {locations.map((l) => (
          <motion.button
            key={l.id}
            onClick={() => setLocationId(l.id)}
            whileTap={reduce ? undefined : { scale: 0.94 }}
            className={cn(
              "ring-focus rounded-lg border px-3 py-2 text-sm font-semibold transition-all",
              locationId === l.id
                ? "text-white"
                : "border-white/10 bg-night-100 text-steel-dim hover:border-white/25 hover:text-white",
            )}
            style={locationId === l.id ? selectedStyle : undefined}
          >
            {l.long}
          </motion.button>
        ))}
      </div>

      {/* Your Server — mirrors the reference panel's order summary table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
            style={{ background: game.accent }}
          >
            {TIER_COPY[tier].label}
          </span>
          <span className="text-sm font-bold text-white">{game.name}</span>
          <span className="text-xs text-steel-faint">
            {hasLivePlans ? selectedPlan?.slots ?? units : units} {game.pricingUnit === "gb" ? "GB RAM" : "slots"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 py-3 text-xs text-steel-dim sm:grid-cols-4">
          <span>{formatMb(specs.ramMb)} RAM</span>
          <span>{formatMb(specs.diskMb)} SSD</span>
          <span>{specs.databases} database{specs.databases === 1 ? "" : "s"}</span>
          <span>{specs.backups} backup slot{specs.backups === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-steel-faint">Monthly price</p>
          <div className="relative h-10 overflow-hidden sm:h-11">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={price}
                initial={reduce ? false : { y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? undefined : { y: -18, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-clip-text font-display text-4xl font-extrabold text-transparent"
                style={{
                  backgroundImage: `linear-gradient(100deg, ${game.accent}, ${game.accent2})`,
                }}
              >
                ${price.toFixed(2)}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <motion.button
          whileHover={reduce ? undefined : { scale: 1.03 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          onClick={deploy}
          className="ring-focus inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold text-white transition-[filter] hover:brightness-110"
          style={{
            background: `linear-gradient(135deg, ${game.accent} 0%, ${game.accent2} 100%)`,
            boxShadow: `0 0 24px ${game.accent}55`,
          }}
        >
          <Rocket className="h-5 w-5" /> Deploy Now
        </motion.button>
      </div>
      <p className="mt-3 text-center text-[11px] text-steel-faint">
        Instant setup · 72-hour money-back guarantee · Cancel anytime
      </p>
    </div>
  );
}
