import {
  Cpu,
  Gamepad2,
  Globe2,
  HardDrive,
  Headset,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GameCard } from "@/components/marketing/GameCard";
import { GAMES } from "@/content/games";
import { getDisplayLocations } from "@/lib/locations";

export const revalidate = 300;

const services = [
  {
    icon: Gamepad2,
    title: "Game Server Hosting",
    href: "/games",
    price: "from $3.60/mo",
    points: ["15+ games supported", "Automatic off-site backups", "One-click mod installers", "Instant activation"],
  },
  {
    icon: Server,
    title: "Ryzen VPS Hosting",
    href: "/vps",
    price: "from $5/mo",
    points: ["AMD Ryzen hypervisors", "1–6 vCPU plans", "NVMe storage", "Unmetered bandwidth"],
  },
  {
    icon: HardDrive,
    title: "Dedicated Servers",
    href: "/dedicated",
    price: "from $200/mo",
    points: ["Ryzen 7000/9000 series", "Up to 192 GB DDR5", "10 Gbps uplinks", "Fully owned hardware"],
  },
];

const features = [
  { icon: Shield, title: "DDoS Protection Standard", body: "Multi-terabit filtering on every service, tuned for game traffic. No add-on fees, no asterisks." },
  { icon: Cpu, title: "Industry-Leading Hardware", body: "High-clock Ryzen CPUs, DDR5 memory, and NVMe drives — owned, not resold." },
  { icon: Headset, title: "Real 24/7 Support", body: "Humans who run game servers themselves, with sub-10-minute median response times." },
  { icon: Zap, title: "Instant Activation", body: "Servers provision automatically the moment your payment clears." },
  { icon: Rocket, title: "No Commitment", body: "Month-to-month billing, upgrade or cancel anytime, 72-hour money-back guarantee." },
  { icon: ShieldCheck, title: "Refined Control Panel", body: "Console, files, backups, and mods in one fast dashboard — no clunky legacy panels." },
];

const testimonials = [
  {
    name: "Marcus T.",
    role: "Rust community owner",
    body: "Moved a 200-pop Rust server here after two hosts fell over on wipe day. Zero missed wipes in six months and support actually answers at 3am.",
  },
  {
    name: "Elena R.",
    role: "Minecraft network admin",
    body: "The panel is the best I've used — modpack installs just work, and TPS stays pinned at 20 even with 40 players in the End.",
  },
  {
    name: "Dax K.",
    role: "Palworld server admin",
    body: "Set up crossplay for my Xbox friends in one click. My old host wanted a support ticket and three days for the same thing.",
  },
];

export default async function HomePage() {
  const { locations } = await getDisplayLocations();
  const featured = GAMES.filter((g) => g.badge).slice(0, 4);
  const regions = ["North America", "Europe", "Asia Pacific"] as const;

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="blue" className="mb-6">
              <Zap className="h-3 w-3" /> Instant setup · NVMe hardware · DDoS protected
            </Badge>
            <h1 className="font-display text-4xl font-extrabold italic tracking-tight text-white sm:text-6xl">
              Game servers that{" "}
              <span className="text-gradient-hyper">never blink</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-steel-dim">
              Deploy high-performance game servers in minutes on owned Ryzen
              hardware. One dashboard for console, files, mods, and backups —
              with humans on support around the clock.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <ButtonLink href="/games" size="lg">
                <Gamepad2 className="h-5 w-5" /> Browse Games
              </ButtonLink>
              <ButtonLink href="/vps" variant="secondary" size="lg">
                VPS & Dedicated
              </ButtonLink>
            </div>
            <p className="mt-6 text-xs text-steel-faint">
              72-hour money-back guarantee · No contracts · Cancel anytime
            </p>
          </div>

          {/* Featured games */}
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((g, i) => (
              <div key={g.slug} className="animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <GameCard game={g} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold italic text-white sm:text-4xl">
            Everything you need to <span className="text-gradient-hyper">host anything</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-steel-dim">
            From a four-friend Palworld world to a hundred-node network — same
            hardware, same support, same panel.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((s) => (
            <Card key={s.title} glow className="group">
              <CardBody className="flex h-full flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-hyper-500/10 text-hyper-400 transition-colors group-hover:bg-hyper-500/20">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-sm font-semibold text-hyper-300">{s.price}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-steel-dim">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {p}
                    </li>
                  ))}
                </ul>
                <ButtonLink href={s.href} variant="outline" size="sm" className="mt-6">
                  Explore →
                </ButtonLink>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Network ──────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <Badge tone="blue" className="mb-4">
              <Globe2 className="h-3 w-3" /> Global network
            </Badge>
            <h2 className="font-display text-3xl font-bold italic text-white sm:text-4xl">
              Low latency, <span className="text-gradient-hyper">wherever you play</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-steel-dim">
              Locations synced live from our infrastructure — what you see here
              is what you can deploy to right now.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {regions.map((region) => {
              const locs = locations.filter((l) => l.region === region);
              return (
                <Card key={region}>
                  <CardBody>
                    <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-steel-dim">
                      {region}
                    </h3>
                    {locs.length ? (
                      <ul className="space-y-2.5">
                        {locs.map((l) => (
                          <li key={l.id} className="flex items-center gap-2.5 text-sm text-steel">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                            {l.long}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-steel-faint">Coming soon</p>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── DDoS stats ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="glass relative overflow-hidden rounded-3xl p-10 sm:p-14">
          <div className="absolute inset-0 bg-radial-glow" />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge tone="blue" className="mb-4">
                <Shield className="h-3 w-3" /> Always-on protection
              </Badge>
              <h2 className="font-display text-3xl font-bold italic text-white">
                DDoS protection as a <span className="text-gradient-hyper">standard</span>, not an upsell
              </h2>
              <p className="mt-4 leading-relaxed text-steel-dim">
                Every HyperNode service sits behind multi-terabit mitigation
                with filters tuned specifically for game traffic, so a salty
                raider with a booter can&apos;t take your community offline.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { stat: "50+", label: "Attack types filtered" },
                { stat: "100k+", label: "Attacks mitigated" },
                { stat: "<1s", label: "Time to mitigation" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display text-4xl font-extrabold text-gradient-hyper">{s.stat}</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-steel-faint">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feature grid ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold italic text-white sm:text-4xl">
            Why communities <span className="text-gradient-hyper">stay</span>
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} glow>
              <CardBody>
                <f.icon className="mb-3 h-6 w-6 text-hyper-400" />
                <h3 className="font-display text-base font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-dim">{f.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-night-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="mb-3 flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-warning text-warning" />
              ))}
            </div>
            <h2 className="font-display text-3xl font-bold italic text-white">
              Trusted by server owners
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name}>
                <CardBody>
                  <p className="text-sm leading-relaxed text-steel">&ldquo;{t.body}&rdquo;</p>
                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-steel-faint">{t.role}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h2 className="font-display text-4xl font-extrabold italic text-white sm:text-5xl">
          Ready to <span className="text-gradient-hyper">deploy</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-steel-dim">
          Instant provisioning, a 72-hour money-back guarantee, and real 24/7
          technical support. Your server is minutes away.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <ButtonLink href="/games" size="lg">
            <Rocket className="h-5 w-5" /> Deploy your server
          </ButtonLink>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-steel-faint">
          <span>✓ 72-hour money-back guarantee</span>
          <span>✓ Instant service provisioning</span>
          <span>✓ Real 24/7 technical support</span>
        </div>
      </section>
    </>
  );
}
