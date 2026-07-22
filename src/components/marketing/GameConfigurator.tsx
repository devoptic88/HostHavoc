"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CircleDollarSign,
  LifeBuoy,
  Rocket,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Game } from "@/content/games";
import { priceFor } from "@/content/games";
import type { DisplayLocation } from "@/lib/locations";

export function GameConfigurator({
  game,
  locations,
}: {
  game: Game;
  locations: DisplayLocation[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [units, setUnits] = useState(game.defaultSlots);
  const [locationId, setLocationId] = useState(locations[0]?.id);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [promoCode, setPromoCode] = useState("");
  const unitLabel = game.pricingUnit === "gb" ? "GB RAM" : "Player Slots";

  const monthlyPrice = priceFor(game, units);
  const annualMonthlyPrice = Math.round(monthlyPrice * 0.9 * 100) / 100;
  const price = billingInterval === "year" ? annualMonthlyPrice : monthlyPrice;
  const annualBilledNow = Math.round(price * 12 * 100) / 100;
  const selectedStyle = {
    borderColor: `${game.accent}99`,
    background: `${game.accent}1F`,
    boxShadow: `0 0 14px ${game.accent}40`,
  };

  return (
    <div className="surface-panel rounded-[28px] p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-steel-dim">
            Guided deployment
          </h3>
          <p className="mt-1 text-sm text-steel">
            Choose capacity, region, and billing. We stage the rest for you.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
          {[
            { id: "month", label: "Monthly" },
            { id: "year", label: "Annual", note: "Save 10%" },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setBillingInterval(option.id as "month" | "year")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                billingInterval === option.id
                  ? "bg-white text-night"
                  : "text-steel hover:text-white",
              )}
            >
              {option.label}
              {option.note ? <span className="ml-1 text-[10px] opacity-75">{option.note}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ProofChip icon={Zap} label="Typical deploy" value="< 5 min" accent={game.accent} />
        <ProofChip icon={Shield} label="Protection" value="Always-on DDoS" accent={game.accent} />
        <ProofChip icon={LifeBuoy} label="Support" value="24/7 operator team" accent={game.accent} />
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-steel-faint">
        {unitLabel}
      </p>
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

      <div className="mt-6 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-steel-faint">
            Promotion code
          </label>
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Optional"
            className="ring-focus w-full rounded-xl border border-white/10 bg-night-100 px-3.5 py-2.5 text-sm text-white placeholder:text-steel-faint"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-steel-faint">
            Included by default
          </p>
          <ul className="mt-2 space-y-2 text-xs text-steel">
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: game.accent }} />
              Off-site backups
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: game.accent }} />
              Mission-control dashboard
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: game.accent }} />
              Contextual support access
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-7 flex items-end justify-between border-t border-white/[0.06] pt-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-steel-faint">
            {billingInterval === "year" ? "Effective monthly" : "Monthly price"}
          </p>
          <div className="relative h-10 overflow-hidden sm:h-11">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={`${billingInterval}-${price}`}
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
          <p className="mt-1 text-xs text-steel-faint">
            {billingInterval === "year"
              ? `Billed today: $${annualBilledNow.toFixed(2)}`
              : "Billed monthly, cancel anytime"}
          </p>
        </div>
        <motion.button
          whileHover={reduce ? undefined : { scale: 1.03 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          onClick={() =>
            router.push(
              `/checkout?game=${game.slug}&units=${units}&location=${locationId ?? ""}&billing=${billingInterval}${promoCode ? `&promo=${encodeURIComponent(promoCode)}` : ""}`,
            )
          }
          className="ring-focus inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold text-white transition-[filter] hover:brightness-110"
          style={{
            background: `linear-gradient(135deg, ${game.accent} 0%, ${game.accent2} 100%)`,
            boxShadow: `0 0 24px ${game.accent}55`,
          }}
        >
          <Rocket className="h-5 w-5" /> Deploy Now
        </motion.button>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-steel-faint">
          <CircleDollarSign className="h-3.5 w-3.5" />
          Before you check out
        </div>
        <p className="mt-2 text-sm text-steel">
          We stage provisioning transparently, land you in the operational overview first, and keep support one click away if setup needs attention.
        </p>
      </div>
    </div>
  );
}

function ProofChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3">
      <div className="flex items-center gap-2 text-steel-faint">
        <Icon className="h-4 w-4" style={{ color: accent }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
