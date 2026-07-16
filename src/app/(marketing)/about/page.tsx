import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "HyperNode is built by server owners, for server owners — owned hardware, honest pricing, and support that actually answers.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="glass relative mb-12 overflow-hidden rounded-3xl">
        <Image
          src="/brand/logo-full.png"
          alt="HyperNode — Game Server Hosting"
          width={1536}
          height={1024}
          className="w-full"
          priority
        />
      </div>
      <h1 className="font-display text-4xl font-extrabold italic text-white">
        Built by server owners, <span className="text-gradient-hyper">for server owners</span>
      </h1>
      <div className="mt-8 space-y-5 leading-relaxed text-steel-dim">
        <p>
          HyperNode started the way most hosting companies should: with a group
          of community server admins tired of oversold nodes, ticket queues
          that go quiet on weekends, and control panels designed in 2009.
        </p>
        <p>
          So we built the host we wanted to rent from. Owned hardware — high-
          frequency Ryzen CPUs, DDR5 memory, NVMe storage — in premium
          datacenters, fronted by DDoS mitigation that treats a 200-pop wipe
          day like a Tuesday. On top of it, a control panel we actually enjoy
          using: live console, file manager, mod installer, and backups in one
          fast dashboard.
        </p>
        <p>
          Support is staffed by people who run their own game servers. When you
          ask about Oxide plugins or TPS drops, the person answering has fixed
          that exact problem on their own community — usually that same week.
        </p>
      </div>
      <div className="mt-10">
        <ButtonLink href="/games" size="lg">
          Deploy your first server
        </ButtonLink>
      </div>
    </div>
  );
}
