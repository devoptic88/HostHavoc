"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GAMES, GAME_CATEGORIES, type GameCategory } from "@/content/games";
import { GameCard } from "./GameCard";
import { cn } from "@/lib/utils";

export function GamesGrid() {
  const reduce = useReducedMotion();
  const [category, setCategory] = useState<GameCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return GAMES.filter((g) => {
      const matchesCategory = category === "all" || g.categories.includes(category);
      const matchesQuery =
        !query || g.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div>
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex flex-wrap justify-center gap-2">
          {GAME_CATEGORIES.map((c) => (
            <motion.button
              key={c.id}
              onClick={() => setCategory(c.id)}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              className={cn(
                "ring-focus rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
                category === c.id
                  ? "bg-hyper-gradient text-white shadow-glow-sm"
                  : "glass text-steel-dim hover:text-white",
              )}
            >
              {c.label}
            </motion.button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            className="ring-focus w-full rounded-full border border-white/10 bg-night-100 py-2 pl-9 pr-4 text-sm text-white placeholder:text-steel-faint focus:border-hyper-500/60"
          />
        </div>
      </div>

      {filtered.length ? (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((g, i) => (
              <motion.div
                key={g.slug}
                layout
                initial={reduce ? false : { opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.94 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 26,
                  delay: i * 0.03,
                }}
              >
                <GameCard game={g} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <p className="py-20 text-center text-steel-faint">
          No games match “{query}”. Want us to add it? Open a ticket — we add
          new games weekly.
        </p>
      )}
    </div>
  );
}
