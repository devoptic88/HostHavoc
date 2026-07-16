"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
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
}: {
  items: NavItem[];
  title: string;
  footerNote?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="glass-strong flex w-full shrink-0 flex-col border-b border-white/[0.06] lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
      </div>
      <p className="px-5 pb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-steel-faint">
        {title}
      </p>
      <nav className="scrollbar-slim flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-x-visible">
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
                "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-hyper-500/15 text-white shadow-glow-sm"
                  : "text-steel-dim hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-hyper-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-white/[0.06] px-3 py-3 lg:block">
        {footerNote && (
          <p className="mb-2 px-3 text-[11px] text-steel-faint">{footerNote}</p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-steel-dim transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
