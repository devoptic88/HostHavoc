import type { Metadata } from "next";
import { Check, Cpu, Gauge, Headset, Server, Shield, Zap } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Ryzen VPS Hosting",
  description:
    "NVMe-backed Ryzen VPS hosting with unmetered bandwidth, instant upgrades, and DDoS protection standard. From $5/mo.",
};

import { VPS_PLANS } from "@/content/plans";

const pillars = [
  { icon: Headset, title: "24/7 human support", body: "Sub-10-minute median first response, around the clock." },
  { icon: Gauge, title: "Tuned for low latency", body: "Hypervisors optimized for game servers, bots, and real-time apps." },
  { icon: Cpu, title: "Ryzen performance", body: "3.4–4.9 GHz cores — no oversold, throttled vCPUs." },
  { icon: Shield, title: "Upstream DDoS filtering", body: "Attacks are scrubbed before they reach your VPS." },
];

const osList = ["Ubuntu", "Debian", "AlmaLinux", "Rocky Linux", "Fedora", "Windows Server*"];

export default function VpsPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <Badge tone="blue" className="mb-4">
            <Server className="h-3 w-3" /> AMD Ryzen · NVMe · Unmetered bandwidth
          </Badge>
          <h1 className="font-display text-4xl font-extrabold italic text-white sm:text-5xl">
            Ryzen VPS hosting with <span className="text-gradient-hyper">real cores</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-steel-dim">
            High-frequency AMD Ryzen hypervisors with NVMe storage and a 99.9%
            uptime guarantee. Deploy in minutes, upgrade in place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {VPS_PLANS.map((p) => (
            <Card
              key={p.id}
              glow
              className={p.popular ? "relative border-hyper-500/50 shadow-glow-sm" : ""}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="blue">Most Popular</Badge>
                </span>
              )}
              <CardBody className="flex h-full flex-col text-center">
                <h3 className="font-display text-lg font-extrabold text-white">{p.name}</h3>
                <p className="mt-2 font-display text-3xl font-extrabold text-gradient-hyper">
                  ${p.price}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-steel-faint">per month</p>
                <ul className="mt-5 flex-1 space-y-2 text-left text-sm text-steel-dim">
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{p.ram} GB DDR5 RAM</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{p.vcpu} vCPU @ 3.4–4.9 GHz</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{p.disk} GB NVMe</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{p.net} unmetered</li>
                </ul>
                <ButtonLink
                  href={`/checkout?product=vps&plan=${p.id}`}
                  size="sm"
                  variant={p.popular ? "primary" : "outline"}
                  className="mt-5"
                >
                  Deploy
                </ButtonLink>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-night-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-hyper-500/10 text-hyper-400">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-bold text-white">{p.title}</h3>
              <p className="mt-2 text-sm text-steel-dim">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-2xl font-bold italic text-white">
          Your OS, <span className="text-gradient-hyper">your call</span>
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {osList.map((os) => (
            <span key={os} className="glass rounded-full px-5 py-2 text-sm font-semibold text-steel">
              {os}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-steel-faint">*Windows Server licensing available as an add-on.</p>
        <div className="mt-10">
          <ButtonLink href="/checkout?product=vps&plan=vps-4" size="lg">
            <Zap className="h-5 w-5" /> Deploy your VPS
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
