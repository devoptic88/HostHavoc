import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Cpu,
  FolderCog,
  Gauge,
  HardDrive,
  Network,
  Rocket,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import {
  GAMES,
  getGame,
  gameHero,
  gameScreens,
  startingPrice,
} from "@/content/games";
import { getDisplayLocations } from "@/lib/locations";
import { GameConfigurator } from "@/components/marketing/GameConfigurator";
import { GameHero } from "@/components/marketing/game/GameHero";
import { ScreenshotStrip } from "@/components/marketing/game/ScreenshotStrip";
import { FaqAccordion } from "@/components/marketing/game/FaqAccordion";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { TypingConsole } from "@/components/motion/TypingConsole";
import { Card, CardBody } from "@/components/ui/Card";
import { slugify } from "@/lib/utils";

export const revalidate = 300;

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const game = getGame(params.slug);
  if (!game) return {};
  return {
    title: `${game.name} Server Hosting`,
    description: `${game.tagline} From $${startingPrice(game).toFixed(2)}/mo with instant setup, NVMe hardware, and DDoS protection.`,
  };
}

const panelFeatures = [
  "Live web console",
  "Full file manager",
  "One-click mod installer",
  "Off-site backups",
  "Startup variable editor",
  "Scheduled tasks & restarts",
];

const withUs = [
  "Pick your plan and region — checkout takes two minutes",
  "Server deploys automatically and boots within minutes",
  "Manage everything from one dashboard: console, files, mods, backups",
];

const withoutUs = [
  "Rent bare hardware, install SteamCMD, and fight dependency errors",
  "Write and maintain config files and launch scripts by hand",
  "Set up port forwarding, firewalls, and DDoS mitigation yourself",
  "Keep a machine running (and patched) 24/7 at home",
  "Re-do the update dance every time the game patches",
];

export default async function GamePage({ params }: { params: { slug: string } }) {
  const game = getGame(params.slug);
  if (!game) notFound();
  const { locations } = await getDisplayLocations();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${game.name} Server Hosting`,
    description: game.tagline,
    brand: { "@type": "Brand", name: "HyperNode" },
    offers: {
      "@type": "Offer",
      price: startingPrice(game).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  const accentText = (text: string) => (
    <span
      className="bg-clip-text text-transparent"
      style={{ backgroundImage: `linear-gradient(100deg, ${game.accent}, ${game.accent2})` }}
    >
      {text}
    </span>
  );

  const consoleLines = [
    `[HyperNode] Provisioning ${game.name} server…`,
    "[HyperNode] Allocating NVMe volume … done",
    "[HyperNode] Pulling latest build … done",
    "[Server] Startup complete in 42s",
    "[Server] Listening on 0.0.0.0:28015",
    "[HyperNode] Backup schedule active (daily @ 04:00)",
    "[HyperNode] Status: ONLINE ✔",
  ];

  return (
    <div
      id="top"
      style={{ "--ga": game.accent, "--ga2": game.accent2 } as React.CSSProperties}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Cinematic hero + configurator ───────────────────── */}
      <GameHero
        name={game.name}
        badge={game.badge}
        tagline={game.tagline}
        accent={game.accent}
        accent2={game.accent2}
        heroSrc={gameHero(game.slug)}
      >
        <GameConfigurator game={game} locations={locations} />
      </GameHero>

      {/* ─── Selling points ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {game.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} className="h-full">
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1">
                <CardBody>
                  <ShieldCheck className="mb-3 h-6 w-6" style={{ color: game.accent }} />
                  <h3 className="font-display text-base font-bold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-steel-dim">{f.body}</p>
                </CardBody>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Hardware band ───────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-night-50 py-14">
        <Reveal>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-14 gap-y-6 px-4 sm:px-6">
            <div className="flex items-center gap-3 text-sm font-semibold text-steel">
              <Cpu className="h-5 w-5" style={{ color: game.accent }} />
              <span>
                Ryzen & Xeon CPUs up to{" "}
                <CountUp value={4.9} decimals={1} suffix=" GHz" className="text-white" />
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-steel">
              <Gauge className="h-5 w-5" style={{ color: game.accent }} />
              DDR4 & DDR5 memory
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-steel">
              <HardDrive className="h-5 w-5" style={{ color: game.accent }} />
              NVMe SSD storage
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-steel">
              <Network className="h-5 w-5" style={{ color: game.accent }} />
              <span>
                Up to <CountUp value={10} suffix=" Gbps" className="text-white" /> uplinks
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── Panel + live console ────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-display text-2xl font-bold italic text-white">
            A control panel that {accentText("stays out of your way")}
          </h2>
          <p className="mt-4 leading-relaxed text-steel-dim">
            Your {game.name} server comes with the full HyperNode panel — live
            console, file manager, mod installer, backups, and schedules in one
            fast dashboard.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {panelFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-steel">
                <Check className="h-4 w-4 shrink-0" style={{ color: game.accent }} /> {f}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="glass relative overflow-hidden rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Terminal className="h-4 w-4" style={{ color: game.accent }} />
              <span className="font-mono text-xs text-steel-dim">
                console — {game.slug}.hypernode.gg
              </span>
              <span
                className="ml-auto h-2 w-2 animate-pulse rounded-full"
                style={{ background: game.accent }}
              />
            </div>
            <TypingConsole
              lines={consoleLines}
              className="scrollbar-slim min-h-[176px] overflow-x-auto rounded-lg bg-night p-4 font-mono text-xs leading-relaxed text-steel-dim"
            />
          </div>
        </Reveal>
      </section>

      {/* ─── About the game + screenshots ────────────────────── */}
      <section className="overflow-hidden border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <h2 className="font-display text-2xl font-bold italic text-white">
              Why host a dedicated {accentText(game.name)} server?
            </h2>
            {game.description.map((p, i) => (
              <p key={i} className="mt-5 max-w-4xl leading-relaxed text-steel-dim">
                {p}
              </p>
            ))}
          </Reveal>
          <ScreenshotStrip
            name={game.name}
            screenshots={gameScreens(game.slug)}
            accent={game.accent}
          />
        </div>
      </section>

      {/* ─── With vs without ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="mb-10 text-center font-display text-2xl font-bold italic text-white">
            Setting up {game.name}: {accentText("with HyperNode")} vs. going it alone
          </h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <Card className="h-full border-success/20">
              <CardBody>
                <h3 className="mb-4 font-display text-lg font-bold text-success">With HyperNode</h3>
                <ol className="space-y-3">
                  {withUs.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-steel">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          </Reveal>
          <Reveal delay={0.12}>
            <Card className="h-full border-danger/20">
              <CardBody>
                <h3 className="mb-4 font-display text-lg font-bold text-danger">Self-hosting</h3>
                <ol className="space-y-3">
                  {withoutUs.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-steel-dim">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                      {s}
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ─── Guides ──────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-night-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-8 flex items-center gap-3">
              <BookOpen className="h-5 w-5" style={{ color: game.accent }} />
              <h2 className="font-display text-xl font-bold text-white">
                {game.name} guides & resources
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {game.guides.map((g, i) => (
              <Reveal key={g} delay={i * 0.05}>
                <Link
                  href={`/wiki/${game.slug}/${slugify(g)}`}
                  className="glass group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-steel transition-all hover:border-white/25 hover:text-white"
                >
                  <FolderCog className="h-4 w-4 shrink-0" style={{ color: game.accent }} />
                  {g}
                  <span className="ml-auto text-steel-faint transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="mb-8 text-center font-display text-2xl font-bold italic text-white">
            Frequently asked questions
          </h2>
        </Reveal>
        <FaqAccordion faq={game.faq} accent={game.accent} />
      </section>

      {/* ─── Closing CTA ─────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-white/[0.06] bg-night-50 py-20 text-center">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${game.accent}66, transparent)`,
          }}
        />
        <Reveal className="relative">
          <h2 className="font-display text-3xl font-extrabold italic text-white">
            Create your {accentText(game.name)} server today
          </h2>
          <p className="mx-auto mt-3 max-w-md text-steel-dim">
            Instant activation, backed by our 72-hour money-back guarantee.
          </p>
          <div className="mt-7">
            <a
              href="#top"
              className="ring-focus inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold text-white transition-all hover:brightness-110"
              style={{
                background: `linear-gradient(135deg, ${game.accent} 0%, ${game.accent2} 100%)`,
                boxShadow: `0 0 32px ${game.accent}55`,
              }}
            >
              <Rocket className="h-5 w-5" />
              Deploy from ${startingPrice(game).toFixed(2)}/mo
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
