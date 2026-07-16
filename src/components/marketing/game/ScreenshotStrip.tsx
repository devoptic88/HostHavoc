"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Horizontal in-game screenshot gallery with scroll-snap and staggered
 * entrance. Screenshots that fail to load (missing file) are hidden.
 */
export function ScreenshotStrip({
  name,
  screenshots,
  accent,
}: {
  name: string;
  screenshots: string[];
  accent: string;
}) {
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const visible = screenshots.filter((s) => !failed[s]);
  if (!visible.length) return null;

  return (
    <div className="scrollbar-slim -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
      {visible.map((src, i) => (
        <motion.div
          key={src}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="group relative aspect-video w-72 shrink-0 snap-start overflow-hidden rounded-xl border border-white/[0.08] sm:w-96"
          style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.45)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${name} screenshot ${i + 1}`}
            loading="lazy"
            onError={() => setFailed((f) => ({ ...f, [src]: true }))}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ boxShadow: `inset 0 0 0 1px ${accent}66` }}
          />
        </motion.div>
      ))}
    </div>
  );
}
