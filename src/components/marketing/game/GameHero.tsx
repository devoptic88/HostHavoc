"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import type { ReactNode } from "react";

const PERKS = ["Instant setup", "DDoS protected", "NVMe storage", "24/7 support"];

/**
 * Cinematic game-page hero: full-bleed key art with parallax, accent-tinted
 * overlays, and staggered entrance. `children` is the configurator panel.
 */
export function GameHero({
  name,
  badge,
  tagline,
  accent,
  accent2,
  heroSrc,
  children,
}: {
  name: string;
  badge?: string;
  tagline: string;
  accent: string;
  accent2: string;
  heroSrc: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };
  const item = {
    hidden: reduce ? {} : { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section ref={ref} className="relative overflow-hidden border-b border-white/[0.06]">
      {/* Key art with parallax */}
      <motion.div
        className="absolute inset-[-12%_0_-12%_0]"
        style={reduce ? undefined : { y: bgY }}
      >
        <Image
          src={heroSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      {/* Legibility + theme overlays */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(5,7,13,0.94) 0%, rgba(5,7,13,0.78) 45%, rgba(5,7,13,0.55) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 70% at 15% 0%, ${accent}2E, transparent 60%), radial-gradient(ellipse 60% 60% at 90% 100%, ${accent2}24, transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px] opacity-60" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-night to-transparent" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.nav variants={item} className="mb-4 text-xs text-steel-faint">
            <Link href="/games" className="transition-colors hover:text-white">
              Game Servers
            </Link>{" "}
            / <span className="text-steel">{name}</span>
          </motion.nav>
          {badge && (
            <motion.div variants={item}>
              <Badge tone="blue" className="mb-4 border-white/10 bg-white/10 backdrop-blur-md">
                {badge}
              </Badge>
            </motion.div>
          )}
          <motion.h1
            variants={item}
            className="font-display text-4xl font-extrabold italic text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-5xl"
          >
            {name}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(100deg, ${accent}, ${accent2})` }}
            >
              Server Hosting
            </span>
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-5 max-w-lg text-lg leading-relaxed text-steel"
          >
            {tagline}
          </motion.p>
          <motion.div
            variants={item}
            className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-steel"
          >
            {PERKS.map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4" style={{ color: accent }} /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
