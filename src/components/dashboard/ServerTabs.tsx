"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "", label: "Console" },
  { path: "/files", label: "Files" },
  { path: "/backups", label: "Backups" },
  { path: "/databases", label: "Databases" },
  { path: "/schedules", label: "Schedules" },
  { path: "/startup", label: "Startup" },
  { path: "/settings", label: "Settings" },
];

export function ServerTabs({ orderId }: { orderId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/servers/${orderId}`;

  return (
    <nav className="scrollbar-slim mt-6 flex gap-1 overflow-x-auto border-b border-white/[0.06]">
      {tabs.map((t) => {
        const href = `${base}${t.path}`;
        const active = pathname === href;
        return (
          <Link
            key={t.path}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "border-hyper-500 text-white"
                : "border-transparent text-steel-dim hover:text-white",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
