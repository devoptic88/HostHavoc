"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Database,
  FolderOpen,
  Gamepad2,
  Gauge,
  History,
  Play,
  RotateCw,
  Settings,
  Skull,
  Square,
  TerminalSquare,
  Timer,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUptime } from "@/lib/utils";

interface Resources {
  current_state: string;
  resources: { uptime: number };
}

export function ServerSidebar({
  orderId,
  gameSlug,
}: {
  orderId: string;
  gameSlug?: string | null;
}) {
  const pathname = usePathname();
  const base = `/dashboard/servers/${orderId}`;
  const [res, setRes] = useState<Resources | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/servers/${orderId}/resources`);
      if (r.ok) setRes(await r.json());
    } catch {
      /* transient */
    }
  }, [orderId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  async function power(signal: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/servers/${orderId}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Power action failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Power action failed");
    } finally {
      setTimeout(() => {
        refresh();
        setBusy(false);
      }, 1200);
    }
  }

  const state = res?.current_state ?? "offline";
  const running = state === "running";
  const isRust = gameSlug === "rust";

  const items = [
    { path: "", label: "Overview", icon: Gauge },
    { path: "/startup", label: "Game Settings", icon: Gamepad2 },
    { path: "/console", label: "Console", icon: TerminalSquare },
    {
      path: "/files",
      label: "Server Files",
      icon: FolderOpen,
      children: [
        { path: "/files", label: "Files" },
        { path: "/files/sftp", label: "SFTP" },
        { path: "/files/installer", label: "Installer" },
      ],
    },
    { path: "/backups", label: "Backups", icon: History },
    { path: "/schedules", label: "Automated Tasks", icon: Repeat },
    { path: "/databases", label: "Databases", icon: Database },
    { path: "/settings", label: "Manage Instance", icon: Settings },
  ];

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[280px] lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-night-100">
        <div
          className={cn(
            "h-[3px] w-full",
            running ? "bg-success" : state === "starting" || state === "stopping" ? "bg-warning" : "bg-white/10",
          )}
        />
        <div className="border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                running ? "bg-success animate-pulse" : "bg-steel-faint",
              )}
            />
            <span className="text-sm font-semibold text-white">
              {running ? "Server online" : state === "starting" ? "Starting…" : state === "stopping" ? "Stopping…" : "Server offline"}
            </span>
            {running && res && (
              <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-steel-faint">
                <Timer className="h-3 w-3" />
                {formatUptime(res.resources.uptime)}
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <button
              disabled={busy || state === "offline"}
              onClick={() => power("stop")}
              className="ring-focus flex h-8 items-center justify-center gap-1 rounded-lg border border-danger/30 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:pointer-events-none disabled:opacity-40"
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
            <button
              disabled={busy || !running}
              onClick={() => power("restart")}
              className="ring-focus flex h-8 items-center justify-center gap-1 rounded-lg border border-white/10 text-xs font-semibold text-steel transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCw className="h-3.5 w-3.5" /> Restart
            </button>
            <button
              disabled={busy || state === "offline"}
              onClick={() => power("kill")}
              className="ring-focus flex h-8 items-center justify-center gap-1 rounded-lg border border-white/10 text-xs font-semibold text-steel-dim transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-40"
              title="Force kill"
            >
              <Skull className="h-3.5 w-3.5" /> Halt
            </button>
          </div>
          {!running && (
            <button
              disabled={busy || running}
              onClick={() => power("start")}
              className="ring-focus mt-1.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-hyper-gradient text-xs font-semibold text-white shadow-glow-sm transition-all hover:brightness-110 disabled:pointer-events-none disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" /> Start Server
            </button>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>

        <nav className="p-2">
          {items.map((item) => {
            const href = `${base}${item.path}`;
            const Icon = item.icon;
            const active = item.path === "" ? pathname === base : pathname === href;
            const expanded = item.children?.some((child) => pathname === `${base}${child.path}`) ?? false;

            if (!item.children) {
              return (
                <Link
                  key={item.path}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? cn(
                          "bg-hyper-500/15 text-hyper-300 ring-1 ring-inset ring-hyper-400/30",
                          isRust && "bg-danger/10 text-danger ring-danger/30",
                        )
                      : "text-steel-dim hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.path}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    expanded
                      ? cn(
                          "bg-hyper-500/15 text-hyper-300 ring-1 ring-inset ring-hyper-400/30",
                          isRust && "bg-danger/10 text-danger ring-danger/30",
                        )
                      : "text-steel-dim hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </Link>
                <div className={cn("mt-1 space-y-1 pl-10", expanded ? "block" : "hidden")}>
                  {item.children.map((child) => {
                    const childHref = `${base}${child.path}`;
                    const childActive = pathname === childHref;
                    return (
                      <Link
                        key={child.path}
                        href={childHref}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm transition-colors",
                          childActive
                            ? "text-hyper-300"
                            : "text-steel-dim hover:bg-white/[0.05] hover:text-white",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
