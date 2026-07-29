"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  CreditCard,
  Egg,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Newspaper,
  Package,
  Server,
  Settings,
  ShoppingCart,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

// Icons are referenced by name because component functions can't cross the
// server → client boundary as props.
const ICONS: Record<string, LucideIcon> = {
  server: Server,
  billing: CreditCard,
  support: LifeBuoy,
  account: UserCircle,
  overview: LayoutDashboard,
  orders: ShoppingCart,
  plans: Package,
  customers: Users,
  nodes: Boxes,
  locations: Globe2,
  eggs: Egg,
  blog: Newspaper,
  wiki: BookOpen,
  settings: Settings,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS & string;
  exact?: boolean;
}

export function Sidebar({
  items,
  title,
  footerNote,
  promo,
  portalSwitch,
  hiddenPathPrefixes = [],
}: {
  items: NavItem[];
  title: string;
  footerNote?: string;
  promo?: {
    cta?: {
      href: string;
      label: string;
    };
    stats?: { label: string; value: string }[];
  };
  portalSwitch?: {
    href: string;
    label: string;
  };
  hiddenPathPrefixes?: string[];
}) {
  const pathname = usePathname();
  const hidden = hiddenPathPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (hidden) return null;

  return (
    <aside className="glass-strong relative flex w-full shrink-0 flex-col overflow-hidden border-b border-white/[0.06] lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_16%)]" />
      <div className="relative flex items-center justify-between px-5 py-5">
        <Logo withTagline={title === "Customer Area"} />
      </div>
      <p className="relative px-5 pb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-steel-faint">
        {title}
      </p>
      <nav className="scrollbar-slim relative flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-x-visible">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? Server;
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200",
                active
                  ? "border-hyper-500/30 bg-[linear-gradient(135deg,rgba(47,107,255,0.22),rgba(56,189,248,0.10))] text-white shadow-glow-sm"
                  : "border-transparent text-steel-dim hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <span className={cn("absolute inset-y-2 left-0 w-1 rounded-r-full bg-hyper-400 transition-opacity", active ? "opacity-100" : "opacity-0")} />
              <Icon className={cn("h-4 w-4 transition-colors", active ? "text-hyper-300" : "group-hover:text-hyper-300")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {promo && (
        <div className="relative hidden px-3 pb-3 lg:block">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,18,32,0.95),rgba(9,13,24,0.92))] p-4 shadow-card">
            {promo.cta && (
              <Link
                href={promo.cta.href}
                className="mb-4 flex items-center justify-between rounded-xl bg-hyper-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow-sm transition-transform duration-200 hover:scale-[1.01]"
              >
                <span>{promo.cta.label}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
            <div className="space-y-3">
              {(promo.stats ?? []).map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-steel-faint">{stat.label}</p>
                  <p className="mt-1 font-display text-lg font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="relative hidden border-t border-white/[0.06] px-3 py-3 lg:block">
        {portalSwitch && (
          <Link
            href={portalSwitch.href}
            className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-steel-dim transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <LayoutDashboard className="h-4 w-4" /> {portalSwitch.label}
          </Link>
        )}
        {footerNote && (
          <p className="mb-2 px-3 text-[11px] text-steel-faint">{footerNote}</p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-steel-dim transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
