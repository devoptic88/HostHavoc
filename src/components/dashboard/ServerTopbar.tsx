"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Cpu, Gauge, HardDrive, Network, Users } from "lucide-react";
import { gameCapsule, getGame } from "@/content/games";
import { cn, formatBytes } from "@/lib/utils";

interface Resources {
  current_state: string;
  resources: {
    memory_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    network_rx_bytes: number;
    network_tx_bytes: number;
    uptime: number;
  };
}

interface ClientServer {
  relationships?: {
    allocations?: {
      data: {
        attributes: { ip: string; ip_alias: string | null; port: number; is_default: boolean };
      }[];
    };
  };
}

export function ServerTopbar({
  orderId,
  name,
  planName,
  gameSlug,
}: {
  orderId: string;
  name: string;
  planName: string;
  gameSlug?: string | null;
}) {
  const [res, setRes] = useState<Resources | null>(null);
  const [details, setDetails] = useState<ClientServer | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/servers/${orderId}/resources`);
      if (response.ok) setRes(await response.json());
    } catch {
      /* transient */
    }
  }, [orderId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    fetch(`/api/servers/${orderId}/details`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setDetails(data))
      .catch(() => {});
  }, [orderId]);

  const game = gameSlug ? getGame(gameSlug) : undefined;
  const alloc = details?.relationships?.allocations?.data.find((item) => item.attributes.is_default)
    ?.attributes;
  const address = alloc ? `${alloc.ip_alias ?? alloc.ip}:${alloc.port}` : null;
  const state = res?.current_state ?? "offline";
  const running = state === "running";
  const headerStyle = game
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(10,14,24,0.78), rgba(10,14,24,0.88)), url('/games/${game.slug}/hero.jpg')`,
      }
    : undefined;

  const stats = useMemo(
    () => [
      {
        label: "RAM",
        value: res ? `${Math.round(res.resources.memory_bytes / (1024 * 1024 * 1024))} GB` : "0 GB",
        accent: "gauge",
        icon: HardDrive,
      },
      {
        label: "CPU",
        value: res ? `${Math.round(res.resources.cpu_absolute)}%` : "0%",
        accent: "gauge",
        icon: Cpu,
      },
      {
        label: "SSD",
        value: res ? formatBytes(res.resources.disk_bytes) : "0 B",
        accent: "gauge",
        icon: Gauge,
      },
      {
        label: "PLAYERS",
        value: "0",
        accent: "panel",
        icon: Users,
      },
      {
        label: "NETWORK",
        value: res ? `IN ${formatBytes(res.resources.network_rx_bytes)}` : "IN 0 B",
        secondary: res ? `OUT ${formatBytes(res.resources.network_tx_bytes)}` : "OUT 0 B",
        accent: "panel",
        icon: Network,
      },
    ],
    [res],
  );

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mb-4 overflow-hidden rounded-[22px] border border-white/[0.08] bg-night-100 shadow-[0_18px_80px_rgba(2,6,23,0.36)]">
      <div
        className="border-b-4 border-hyper-400 bg-cover bg-center px-4 py-3 sm:px-5"
        style={headerStyle}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 bg-black/25 bg-contain bg-center bg-no-repeat shadow-[0_8px_30px_rgba(239,68,68,0.18)]"
              style={
                game
                  ? { backgroundImage: `url('${gameCapsule(game.slug)}')` }
                  : { background: "linear-gradient(135deg, #2F6BFF, #38BDF8)" }
              }
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-3xl font-black uppercase tracking-tight text-white">
                  {game?.name ?? "Server"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-steel-faint">
                  {running ? "Live" : "Offline"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-steel">
                <span className="font-semibold text-white">{name}</span>
                <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
                <span>{planName}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {address && (
              <button
                onClick={copyAddress}
                className="ring-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 font-mono text-xs text-hyper-300 transition-colors hover:border-hyper-400/40"
              >
                {address}
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
            <Link
              href="/dashboard"
              className="ring-focus inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-steel transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(260px,1.35fr)_repeat(4,minmax(0,1fr))]">
          <div className="rounded-[18px] border border-white/[0.08] bg-black/20 px-4 py-2.5 backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-steel-faint">
              {game?.name ?? "Game"} Server
            </div>
            <div className="mt-1 text-sm font-semibold text-white line-clamp-1">
              {game?.tagline ?? "Live game server management"}
            </div>
          </div>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={cn(
                  "rounded-[18px] border px-3 py-2.5 backdrop-blur-sm",
                  stat.accent === "status"
                    ? "border-white/[0.12] bg-white/[0.06]"
                    : "border-white/[0.08] bg-black/20",
                )}
              >
                <div className="flex items-center gap-2 text-steel-faint">
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.26em]">
                    {stat.label}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-1.5 font-mono text-lg font-semibold text-white",
                    stat.accent === "status" && running && "text-success",
                  )}
                >
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] text-steel">{stat.secondary ?? ""}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
