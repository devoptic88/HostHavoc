import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  BookOpen,
  Check,
  FolderCog,
  Rocket,
  ShieldCheck,
  Terminal,
  Timer,
} from "lucide-react";
import {
  GAMES,
  gameHero,
  gameScreens,
  getGame,
  startingPrice,
} from "@/content/games";
import { GameConfigurator } from "@/components/marketing/GameConfigurator";
import { FaqAccordion } from "@/components/marketing/game/FaqAccordion";
import { GameHero } from "@/components/marketing/game/GameHero";
import { ScreenshotStrip } from "@/components/marketing/game/ScreenshotStrip";
import { Reveal } from "@/components/motion/Reveal";
import { TypingConsole } from "@/components/motion/TypingConsole";
import { Card, CardBody } from "@/components/ui/Card";
import { getDisplayLocations } from "@/lib/locations";
import { slugify } from "@/lib/utils";

export const revalidate = 300;

const flagshipCopy: Record<
  string,
  {
    headline: string;
    trust: { label: string; value: string }[];
  }
> = {
  rust: {
    headline: "Built for wipe-day pressure and plugin-heavy communities.",
    trust: [
      { label: "Best for", value: "High-pop communities" },
      { label: "Why it converts", value: "Wipe-ready posture" },
      { label: "Support focus", value: "Performance + plugin triage" },
    ],
  },
  minecraft: {
    headline: "Built for modpacks, networks, and operators who care about TPS.",
    trust: [
      { label: "Best for", value: "Modded and network owners" },
      { label: "Why it converts", value: "Guided RAM + billing flow" },
      { label: "Support focus", value: "World, plugin, and modpack help" },
    ],
  },
  palworld: {
    headline: "Built for persistent crossplay worlds that stay online without babysitting.",
    trust: [
      { label: "Best for", value: "Crossplay friend groups" },
      { label: "Why it converts", value: "Fast dedicated migration path" },
      { label: "Support focus", value: "World settings + save imports" },
    ],
  },
};

const panelFeatures = [
  "Operational overview before deeper tools",
  "Fast live console with startup visibility",
  "File manager, installers, and backups in one flow",
  "Context-aware support ticket entry from the server itself",
];

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const game = getGame(params.slug);
  if (!game) return {};
  return {
    title: `${game.name} Server Hosting`,
    description: `${game.tagline} From $${startingPrice(game).toFixed(2)}/mo with transparent provisioning, NVMe hardware, and a mission-control dashboard.`,
  };
}

export default async function GamePage({ params }: { params: { slug: string } }) {
  const game = getGame(params.slug);
  if (!game) notFound();

  const { locations } = await getDisplayLocations();
  const flagship = flagshipCopy[game.slug];
  const consoleLines = [
    `[HyperNode] Provisioning ${game.name} server...`,
    "[HyperNode] Allocation created... done",
    "[HyperNode] Startup profile applied... done",
    "[HyperNode] Game files verified... done",
    "[HyperNode] Backups and schedules armed",
    "[HyperNode] Overview published -> console online",
  ];

  return (
    <div id="top" style={{ "--ga": game.accent, "--ga2": game.accent2 } as React.CSSProperties}>
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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <p className="section-eyebrow">Buy With Confidence</p>
              <h2 className="mt-3 font-display text-3xl font-bold italic text-white">
                {flagship?.headline ?? `Deploy ${game.name} with a sales flow built around serious operators.`}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-steel-dim">
                HyperNode pushes the proof beside the purchase decision: deployment posture, dashboard realism, and support readiness all show up before checkout.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {(flagship?.trust ?? [
                  { label: "Best for", value: "Communities and operators" },
                  { label: "Provisioning", value: "Transparent staged deploy" },
                  { label: "Support", value: "24/7 operator access" },
                ]).map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="section-eyebrow">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="surface-panel rounded-[28px] p-6">
              <div className="mb-4 flex items-center gap-2 text-steel-faint">
                <Terminal className="h-4 w-4" style={{ color: game.accent }} />
                <span className="section-eyebrow">Provisioning proof</span>
              </div>
              <TypingConsole
                lines={consoleLines}
                className="scrollbar-slim min-h-[208px] overflow-x-auto rounded-2xl bg-night p-4 font-mono text-xs leading-relaxed text-steel"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="section-eyebrow">Why This Page Should Convert</p>
              <h2 className="mt-3 font-display text-3xl font-bold italic text-white sm:text-4xl">
                Product proof lives next to the CTA
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Real infrastructure posture",
                body: "Status, support, and provisioning signals are visible early instead of hidden after payment.",
              },
              {
                icon: Timer,
                title: "Advanced but guided buying",
                body: "Capacity, location, annual billing, and promotion readiness stay visible without overwhelming first-time buyers.",
              },
              {
                icon: Activity,
                title: "Operational follow-through",
                body: "The post-purchase experience continues the same story with overview-first server management and contextual support.",
              },
            ].map((item, index) => (
              <Reveal key={item.title} delay={index * 0.08}>
                <Card className="h-full">
                  <CardBody>
                    <item.icon className="h-6 w-6 text-hyper-300" />
                    <h3 className="mt-4 font-display text-lg font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-steel-dim">{item.body}</p>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-display text-2xl font-bold italic text-white">
            A control panel that stays <span className="text-gradient-hyper">operationally useful</span>
          </h2>
          <p className="mt-4 leading-relaxed text-steel-dim">
            Your {game.name} server comes with the full HyperNode panel: live overview, console, files, installers, backups, schedules, and support pathways designed around real day-to-day server management.
          </p>
          <ul className="mt-6 space-y-3">
            {panelFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-steel">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: game.accent }} />
                {feature}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="grid gap-4 sm:grid-cols-2">
            {game.features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.05}>
                <Card className="h-full">
                  <CardBody>
                    <Rocket className="h-5 w-5" style={{ color: game.accent }} />
                    <h3 className="mt-3 font-display text-base font-bold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-steel-dim">{feature.body}</p>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="overflow-hidden border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <h2 className="font-display text-2xl font-bold italic text-white">
              Why host a dedicated <span className="text-gradient-hyper">{game.name}</span> server?
            </h2>
            {game.description.map((paragraph, index) => (
              <p key={index} className="mt-5 max-w-4xl leading-relaxed text-steel-dim">
                {paragraph}
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

      <section className="border-y border-white/[0.06] bg-night-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-8 flex items-center gap-3">
              <BookOpen className="h-5 w-5" style={{ color: game.accent }} />
              <h2 className="font-display text-xl font-bold text-white">{game.name} guides & resources</h2>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {game.guides.map((guide, index) => (
              <Reveal key={guide} delay={index * 0.05}>
                <Link
                  href={`/wiki/${game.slug}/${slugify(guide)}`}
                  className="glass group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-steel transition-all hover:border-white/25 hover:text-white"
                >
                  <FolderCog className="h-4 w-4 shrink-0" style={{ color: game.accent }} />
                  {guide}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="mb-8 text-center font-display text-2xl font-bold italic text-white">
            Frequently asked questions
          </h2>
        </Reveal>
        <FaqAccordion faq={game.faq} accent={game.accent} />
      </section>

      <section className="relative overflow-hidden border-t border-white/[0.06] bg-night-50 py-20 text-center">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${game.accent}66, transparent)`,
          }}
        />
        <Reveal className="relative">
          <h2 className="font-display text-3xl font-extrabold italic text-white">
            Ready to launch your <span className="text-gradient-hyper">{game.name}</span> server?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-steel-dim">
            Guided checkout, transparent provisioning, and a dashboard that feels like the real product from the first minute.
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
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-steel-faint">
            <span>Annual billing supported</span>
            <span>Promotion-ready checkout</span>
            <span>Server-aware support</span>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
