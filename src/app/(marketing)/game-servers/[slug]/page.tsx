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
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import { GAMES, getGame, startingPrice } from "@/content/games";
import { getDisplayLocations } from "@/lib/locations";
import { GameConfigurator } from "@/components/marketing/GameConfigurator";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
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

  return (
    <div id="top">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Hero + configurator ─────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% -10%, ${game.accent}55, transparent)`,
          }}
        />
        <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <nav className="mb-4 text-xs text-steel-faint">
              <Link href="/games" className="hover:text-hyper-300">
                Game Servers
              </Link>{" "}
              / <span className="text-steel">{game.name}</span>
            </nav>
            {game.badge && (
              <Badge tone="blue" className="mb-4">
                {game.badge}
              </Badge>
            )}
            <h1 className="font-display text-4xl font-extrabold italic text-white sm:text-5xl">
              {game.name}{" "}
              <span className="text-gradient-hyper">Server Hosting</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-steel-dim">
              {game.tagline}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-steel-dim">
              {["Instant setup", "DDoS protected", "NVMe storage", "24/7 support"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> {t}
                </span>
              ))}
            </div>
          </div>
          <GameConfigurator game={game} locations={locations} />
        </div>
      </section>

      {/* ─── Selling points ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {game.features.map((f) => (
            <Card key={f.title} glow>
              <CardBody>
                <ShieldCheck className="mb-3 h-6 w-6 text-hyper-400" />
                <h3 className="font-display text-base font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-dim">{f.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Hardware band ───────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-night-50 py-14">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-14 gap-y-6 px-4 sm:px-6">
          {[
            { icon: Cpu, label: "Ryzen & Xeon CPUs up to 4.9 GHz" },
            { icon: Gauge, label: "DDR4 & DDR5 memory" },
            { icon: HardDrive, label: "NVMe SSD storage" },
            { icon: Network, label: "Up to 10 Gbps uplinks" },
          ].map((h) => (
            <div key={h.label} className="flex items-center gap-3 text-sm font-semibold text-steel">
              <h.icon className="h-5 w-5 text-hyper-400" />
              {h.label}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Panel + description ─────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold italic text-white">
            A control panel that <span className="text-gradient-hyper">stays out of your way</span>
          </h2>
          <p className="mt-4 leading-relaxed text-steel-dim">
            Your {game.name} server comes with the full HyperNode panel — live
            console, file manager, mod installer, backups, and schedules in one
            fast dashboard.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {panelFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-steel">
                <Check className="h-4 w-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass relative overflow-hidden rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-hyper-400" />
            <span className="font-mono text-xs text-steel-dim">console — {game.slug}.hypernode.gg</span>
          </div>
          <pre className="scrollbar-slim overflow-x-auto rounded-lg bg-night p-4 font-mono text-xs leading-relaxed text-steel-dim">
{`[HyperNode] Provisioning ${game.name} server…
[HyperNode] Allocating NVMe volume … done
[HyperNode] Pulling latest build … done
[Server] Startup complete in 42s
[Server] Listening on 0.0.0.0:28015
[HyperNode] Backup schedule active (daily @ 04:00)
[HyperNode] Status: ONLINE ✔`}
          </pre>
        </div>
      </section>

      {/* ─── About the game ──────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold italic text-white">
            Why host a dedicated <span className="text-gradient-hyper">{game.name}</span> server?
          </h2>
          {game.description.map((p, i) => (
            <p key={i} className="mt-5 leading-relaxed text-steel-dim">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* ─── With vs without ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="mb-10 text-center font-display text-2xl font-bold italic text-white">
          Setting up {game.name}: <span className="text-gradient-hyper">with HyperNode</span> vs. going it alone
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-success/20">
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
          <Card className="border-danger/20">
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
        </div>
      </section>

      {/* ─── Guides ──────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-night-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-hyper-400" />
            <h2 className="font-display text-xl font-bold text-white">
              {game.name} guides & resources
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {game.guides.map((g) => (
              <Link
                key={g}
                href={`/wiki/${game.slug}/${slugify(g)}`}
                className="glass group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-steel transition-all hover:border-hyper-500/40 hover:text-white"
              >
                <FolderCog className="h-4 w-4 shrink-0 text-hyper-400" />
                {g}
                <span className="ml-auto text-steel-faint transition-transform group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="mb-8 text-center font-display text-2xl font-bold italic text-white">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {game.faq.map((f) => (
            <details key={f.q} className="glass group rounded-xl">
              <summary className="ring-focus flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-sm font-semibold text-white">
                {f.q}
                <span className="text-hyper-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-steel-dim">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Closing CTA ─────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-night-50 py-20 text-center">
        <h2 className="font-display text-3xl font-extrabold italic text-white">
          Create your <span className="text-gradient-hyper">{game.name}</span> server today
        </h2>
        <p className="mx-auto mt-3 max-w-md text-steel-dim">
          Instant activation, backed by our 72-hour money-back guarantee.
        </p>
        <div className="mt-7">
          <ButtonLink href="#top" size="lg">
            Deploy from ${startingPrice(game).toFixed(2)}/mo
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
