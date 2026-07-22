import {
  Activity,
  ArrowRight,
  Gauge,
  Gamepad2,
  HardDrive,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { GameCard } from "@/components/marketing/GameCard";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { GAMES } from "@/content/games";
import { getDisplayLocations } from "@/lib/locations";

export const revalidate = 300;

const pillars = [
  {
    icon: Gamepad2,
    title: "Game Servers",
    href: "/games",
    body: "Shared game hosting tuned for modded communities, wipe-day spikes, and real operators.",
  },
  {
    icon: Server,
    title: "Ryzen VPS",
    href: "/vps",
    body: "Performance-first virtual infrastructure for bots, proxies, web apps, and orchestration glue.",
  },
  {
    icon: HardDrive,
    title: "Dedicated",
    href: "/dedicated",
    body: "Bare-metal hardware for agencies, resellers, and operators who need total control.",
  },
];

const proofStats = [
  { label: "Provisioning flow", value: "< 5 min" },
  { label: "Support model", value: "24/7 operator team" },
  { label: "Billing", value: "Monthly or annual" },
  { label: "Infrastructure", value: "Owned NVMe hardware" },
];

const controlPoints = [
  "Operational overview before deeper tools",
  "Fast console, file manager, backups, and startup controls",
  "Context-aware support that already knows the server in question",
];

const conversionProof = [
  {
    icon: ShieldCheck,
    title: "Defensible trust signals",
    body: "Status, provisioning flow, and support posture show up where buying decisions happen instead of hiding in the footer.",
  },
  {
    icon: TerminalSquare,
    title: "Panel as the proof",
    body: "The product UI is the hero asset. Buyers should see how the host feels to operate before they ever check out.",
  },
  {
    icon: Zap,
    title: "Serious buyer UX",
    body: "Advanced but guided configuration, annual billing, and promo-ready checkout are built for high-value operators.",
  },
];

const flagshipSlugs = new Set(["rust", "minecraft", "palworld"]);

export default async function HomePage() {
  const { locations } = await getDisplayLocations();
  const featured = GAMES.filter((game) => flagshipSlugs.has(game.slug));

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,107,255,0.24),transparent_28%),linear-gradient(180deg,rgba(8,12,20,0.96)_0%,rgba(5,7,13,1)_100%)]" />
        <div className="absolute inset-0 bg-grid-faint bg-[size:36px_36px] opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:pb-24 lg:pt-28">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <Stagger className="max-w-3xl">
              <StaggerItem>
                <Badge tone="blue" className="mb-6">
                  <Sparkles className="h-3 w-3" /> Premium hosting for serious community operators
                </Badge>
              </StaggerItem>
              <StaggerItem>
                <h1 className="max-w-4xl font-display text-4xl font-extrabold italic tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Infrastructure that <span className="text-gradient-hyper">looks real</span> because it is built to operate that way
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-6 max-w-3xl text-lg leading-relaxed text-steel sm:text-xl">
                  HyperNode is a launch-ready premium host for modded communities, agencies, and high-value operators. Provision transparently, manage from a mission-control dashboard, and keep support one click from the server in question.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <ButtonLink href="/games" size="lg">
                    <Gamepad2 className="h-5 w-5" /> Browse Game Hosting
                  </ButtonLink>
                  <ButtonLink href="/status" variant="secondary" size="lg">
                    <Activity className="h-5 w-5" /> View Network Status
                  </ButtonLink>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {proofStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <p className="section-eyebrow">{stat.label}</p>
                      <p className="mt-2 text-base font-semibold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </StaggerItem>
            </Stagger>

            <Reveal delay={0.2}>
              <div className="surface-panel overflow-hidden rounded-[30px] shadow-card">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div>
                    <p className="section-eyebrow">Product Proof</p>
                    <p className="mt-1 text-lg font-semibold text-white">Operational overview -&gt; console</p>
                  </div>
                  <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-success">
                    Live posture
                  </span>
                </div>
                <div className="grid gap-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <OpsMeter label="CPU" value="42%" width="42%" />
                    <OpsMeter label="Memory" value="61%" width="61%" />
                    <OpsMeter label="Disk" value="34%" width="34%" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="section-eyebrow">Why it converts</p>
                      <ul className="mt-3 space-y-3 text-sm text-steel">
                        {controlPoints.map((point) => (
                          <li key={point} className="flex items-start gap-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-hyper-300" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-xs text-steel">
                      <p className="section-eyebrow">Provisioning trace</p>
                      <div className="mt-3 space-y-2">
                        <p>[HyperNode] Allocation created on Chicago-2</p>
                        <p>[HyperNode] Startup profile applied</p>
                        <p>[HyperNode] Game files verified</p>
                        <p>[HyperNode] Backups + schedules armed</p>
                        <p className="text-success">[HyperNode] Overview published</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="mb-10 text-center">
            <p className="section-eyebrow">Three Product Pillars</p>
            <h2 className="mt-3 font-display text-3xl font-bold italic text-white sm:text-4xl">
              One brand, three ways to operate serious infrastructure
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.08} className="h-full">
              <Card glow className="h-full">
                <CardBody className="flex h-full flex-col">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-hyper-500/10 text-hyper-300">
                    <pillar.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">{pillar.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-steel-dim">{pillar.body}</p>
                  <ButtonLink href={pillar.href} variant="outline" size="sm" className="mt-6">
                    Explore <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                </CardBody>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="section-eyebrow">Flagship Sales Pages</p>
                <h2 className="mt-3 font-display text-3xl font-bold italic text-white sm:text-4xl">
                  Rust, Minecraft, and Palworld lead the story
                </h2>
              </div>
              <ButtonLink href="/games" variant="secondary" size="sm">
                Browse all games
              </ButtonLink>
            </div>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {featured.map((game, index) => (
              <Reveal key={game.slug} delay={index * 0.08} className="h-full">
                <GameCard game={game} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="mb-10 text-center">
            <p className="section-eyebrow">Trust + Conversion</p>
            <h2 className="mt-3 font-display text-3xl font-bold italic text-white sm:text-4xl">
              Proof belongs beside the buy button
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {conversionProof.map((item, index) => (
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
      </section>

      <section className="border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <p className="section-eyebrow">Shared Infrastructure Story</p>
                <h2 className="mt-3 font-display text-3xl font-bold italic text-white sm:text-4xl">
                  Fast provisioning, visible status, and operators who answer with context
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-steel-dim">
                  HyperNode is designed so the same truth flows through marketing, checkout, provisioning, dashboard, and support. Buyers see the operational posture before purchasing, and customers keep that same clarity after deployment.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-steel">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                    {locations.length} live deployment locations
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                    Annual billing ready
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                    Promotion-ready checkout
                  </span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TrustStat label="Deploy regions" value={String(locations.length)} />
                <TrustStat label="Flagship pages" value="3" />
                <TrustStat label="Server workflow" value="Overview -> Console" />
                <TrustStat label="Support path" value="Server-aware tickets" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <Reveal>
          <h2 className="font-display text-4xl font-extrabold italic text-white sm:text-5xl">
            Ready to operate like a <span className="text-gradient-hyper">real host</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-steel-dim">
            Start with shared game hosting, verify the network posture, and move into a dashboard designed around serious day-to-day server management.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/games" size="lg">
              <Rocket className="h-5 w-5" /> Deploy your first server
            </ButtonLink>
            <ButtonLink href="/status" variant="secondary" size="lg">
              <Gauge className="h-5 w-5" /> Inspect network status
            </ButtonLink>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-steel-faint">
            <span>Provisioning posture you can show to customers</span>
            <span>Dashboard built for operators, not tourists</span>
            <span>Support surfaces that stay calm under pressure</span>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function OpsMeter({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="section-eyebrow">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-night-200">
        <div className="h-full rounded-full bg-hyper-gradient" style={{ width }} />
      </div>
    </div>
  );
}

function TrustStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
      <p className="section-eyebrow">{label}</p>
      <p className="mt-3 font-display text-2xl font-bold text-white">
        {value === String(Number(value)) ? <CountUp value={Number(value)} /> : value}
      </p>
    </div>
  );
}
