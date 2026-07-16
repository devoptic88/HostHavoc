import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Products",
    links: [
      { href: "/games", label: "Game Servers" },
      { href: "/vps", label: "VPS Hosting" },
      { href: "/dedicated", label: "Dedicated Servers" },
    ],
  },
  {
    title: "Popular Games",
    links: [
      { href: "/game-servers/minecraft", label: "Minecraft Hosting" },
      { href: "/game-servers/rust", label: "Rust Hosting" },
      { href: "/game-servers/palworld", label: "Palworld Hosting" },
      { href: "/game-servers/valheim", label: "Valheim Hosting" },
      { href: "/game-servers/ark-survival-evolved", label: "ARK Hosting" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/wiki", label: "Knowledgebase" },
      { href: "/blog", label: "Blog" },
      { href: "/status", label: "Network Status" },
      { href: "/dashboard/tickets", label: "Support Tickets" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/sla", label: "SLA & Guarantee" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-night-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Logo withTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-steel-faint">
              High-performance game server hosting on owned NVMe hardware, with
              DDoS protection standard and humans on support around the clock.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-steel-dim">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-steel-faint transition-colors hover:text-hyper-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-steel-faint sm:flex-row">
          <p>© {new Date().getFullYear()} HyperNode. All rights reserved.</p>
          <p>
            Instant activation · 72-hour money-back guarantee · DDoS protection
            standard
          </p>
        </div>
      </div>
    </footer>
  );
}
