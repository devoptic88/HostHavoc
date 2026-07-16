"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import type { Game } from "@/content/games";
import { gameCapsule, startingPrice } from "@/content/games";

export function GameCard({ game }: { game: Game }) {
  const reduce = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="h-full"
    >
      <Link
        href={`/game-servers/${game.slug}`}
        className="glass group relative block h-full overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-[0_0_28px_var(--card-glow)]"
        style={
          {
            "--card-glow": `${game.accent}45`,
          } as React.CSSProperties
        }
      >
        <div className="relative aspect-[460/215] overflow-hidden bg-night-200">
          {!imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gameCapsule(game.slug)}
              alt={`${game.name} artwork`}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${game.accent}33, transparent 60%), linear-gradient(135deg, #0D1320, #151D2E)`,
              }}
            >
              <span className="font-display text-2xl font-extrabold italic tracking-tight text-white/90">
                {game.name}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-transparent opacity-80" />
          {game.badge && (
            <div className="absolute left-3 top-3">
              <Badge tone="blue" className="backdrop-blur-md">
                {game.badge}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold text-white transition-colors group-hover:text-hyper-300">
              {game.name}
            </h3>
            <p className="mt-0.5 text-xs text-steel-faint">
              from{" "}
              <span className="font-semibold text-steel">
                ${game.pricePerUnit.toFixed(2)}
              </span>
              /{game.pricingUnit === "gb" ? "GB" : "slot"}
            </p>
          </div>
          <div className="text-right">
            <p
              className="bg-clip-text font-display text-lg font-bold text-transparent"
              style={{
                backgroundImage: `linear-gradient(100deg, ${game.accent}, ${game.accent2})`,
              }}
            >
              ${startingPrice(game).toFixed(2)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-steel-faint">
              per month
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
