"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
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
  const unitLabel = game.pricingUnit === "gb" ? "GB RAM" : "Player Slots";

  const price = priceFor(game, units);
  const selectedStyle = {
    borderColor: `${game.accent}99`,
    background: `${game.accent}1F`,
    boxShadow: `0 0 14px ${game.accent}40`,
  };

  return (
    <div className="glass-strong rounded-2xl p-6 shadow-card">
      <h3 className="font-display text-sm font-bold uppercase tracking-widest text-steel-dim">
        Configure your server
      </h3>

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

      <div className="mt-7 flex items-end justify-between border-t border-white/[0.06] pt-5">
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
          onClick={() =>
            router.push(
              `/checkout?game=${game.slug}&units=${units}&location=${locationId ?? ""}`,
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
      <p className="mt-3 text-center text-[11px] text-steel-faint">
        Instant setup · 72-hour money-back guarantee · Cancel anytime
      </p>
    </div>
  );
}
