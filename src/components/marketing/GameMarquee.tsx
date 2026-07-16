import Link from "next/link";
import { GAMES, gamePortrait } from "@/content/games";
import { Marquee } from "@/components/motion/Marquee";

/** Infinite scrolling strip of game key art linking to each game page. */
export function GameMarquee() {
  return (
    <Marquee speed={50}>
      {GAMES.map((g) => (
        <Link
          key={g.slug}
          href={`/game-servers/${g.slug}`}
          className="group/tile relative block h-48 w-36 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-night-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gamePortrait(g.slug)}
            alt={g.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover/tile:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-night/95 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100" />
          <span
            className="absolute bottom-2.5 left-0 right-0 px-2 text-center font-display text-xs font-bold text-white opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
          >
            {g.name}
          </span>
        </Link>
      ))}
    </Marquee>
  );
}
