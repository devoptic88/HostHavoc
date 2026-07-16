import type { Metadata } from "next";
import { Check, Cpu, FileCheck, HardDrive, Handshake, Timer } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { DEDICATED_PLANS } from "@/content/plans";

export const metadata: Metadata = {
  title: "Dedicated Servers",
  description:
    "Bare-metal AMD Ryzen dedicated servers with NVMe storage, 10 Gbps uplinks, and a 100% power & network SLA. From $200/mo.",
};

const features = [
  { icon: Handshake, title: "No contracts, no hidden fees", body: "Month-to-month billing. Cancel whenever — your hardware, your call." },
  { icon: FileCheck, title: "Managed or unmanaged", body: "Take the keys yourself or let our team handle OS and panel management." },
  { icon: Timer, title: "100% power & network SLA", body: "Credit-backed uptime guarantee on power and network." },
  { icon: Cpu, title: "Owned hardware", body: "We own every node in every rack. No reseller roulette." },
];

export default function DedicatedPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px]" />
        <Stagger className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <StaggerItem>
            <Badge tone="blue" className="mb-4">
              <HardDrive className="h-3 w-3" /> Bare metal · 10 Gbps · NVMe
            </Badge>
          </StaggerItem>
          <StaggerItem>
            <h1 className="font-display text-4xl font-extrabold italic text-white sm:text-5xl">
              Dedicated servers, <span className="text-gradient-hyper">zero neighbors</span>
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-4 max-w-xl text-steel-dim">
              High-frequency Ryzen bare metal for game networks, hypervisors, and
              anything that can&apos;t share. Every spec upgradeable.
            </p>
          </StaggerItem>
        </Stagger>
      </section>

      <section className="mx-auto max-w-5xl space-y-5 px-4 py-16 sm:px-6">
        {DEDICATED_PLANS.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.06}>
          <Card glow className={p.soldOut ? "opacity-60" : ""}>
            <CardBody className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-xl font-extrabold text-white">{p.cpu}</h3>
                  {p.soldOut && <Badge tone="red">Sold Out</Badge>}
                </div>
                <div className="mt-4 grid gap-x-8 gap-y-2 text-sm text-steel-dim sm:grid-cols-2 lg:grid-cols-4">
                  {[p.cores, p.ram, p.disk, p.bandwidth].map((spec) => (
                    <span key={spec} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-success" /> {spec}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-6 lg:flex-col lg:items-end lg:gap-2">
                <p className="font-display text-3xl font-extrabold text-gradient-hyper">
                  ${p.price}
                  <span className="text-sm font-semibold text-steel-faint">/mo</span>
                </p>
                <ButtonLink
                  href={`/checkout?product=dedicated&plan=${p.id}`}
                  size="sm"
                  variant={p.soldOut ? "secondary" : "primary"}
                  className={p.soldOut ? "pointer-events-none" : ""}
                >
                  {p.soldOut ? "Unavailable" : "Configure"}
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
          </Reveal>
        ))}
      </section>

      <section className="border-t border-white/[0.06] bg-night-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
            <div className="text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-hyper-500/10 text-hyper-400">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-steel-dim">{f.body}</p>
            </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
