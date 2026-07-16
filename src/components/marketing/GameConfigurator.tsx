"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  const [units, setUnits] = useState(game.defaultSlots);
  const [locationId, setLocationId] = useState(locations[0]?.id);
  const unitLabel = game.pricingUnit === "gb" ? "GB RAM" : "Player Slots";

  const price = priceFor(game, units);

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
          <button
            key={s}
            onClick={() => setUnits(s)}
            className={cn(
              "ring-focus min-w-[52px] rounded-lg border px-3 py-2 text-sm font-bold transition-all",
              units === s
                ? "border-hyper-400/60 bg-hyper-500/20 text-white shadow-glow-sm"
                : "border-white/10 bg-night-100 text-steel-dim hover:border-hyper-500/40 hover:text-white",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-steel-faint">
        Server Location
      </p>
      <div className="flex flex-wrap gap-2">
        {locations.map((l) => (
          <button
            key={l.id}
            onClick={() => setLocationId(l.id)}
            className={cn(
              "ring-focus rounded-lg border px-3 py-2 text-sm font-semibold transition-all",
              locationId === l.id
                ? "border-hyper-400/60 bg-hyper-500/20 text-white shadow-glow-sm"
                : "border-white/10 bg-night-100 text-steel-dim hover:border-hyper-500/40 hover:text-white",
            )}
          >
            {l.long}
          </button>
        ))}
      </div>

      <div className="mt-7 flex items-end justify-between border-t border-white/[0.06] pt-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-steel-faint">Monthly price</p>
          <p className="font-display text-4xl font-extrabold text-gradient-hyper">
            ${price.toFixed(2)}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() =>
            router.push(
              `/checkout?game=${game.slug}&units=${units}&location=${locationId ?? ""}`,
            )
          }
        >
          <Rocket className="h-5 w-5" /> Deploy Now
        </Button>
      </div>
      <p className="mt-3 text-center text-[11px] text-steel-faint">
        Instant setup · 72-hour money-back guarantee · Cancel anytime
      </p>
    </div>
  );
}
