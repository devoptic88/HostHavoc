"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  Copy,
  Cpu,
  Gauge,
  HardDrive,
  Network,
  Timer,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { getGame } from "@/content/games";
import { cn, formatBytes, formatUptime } from "@/lib/utils";

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
  ramMb,
  cpuPercent,
  diskMb,
  viewerLabel,
}: {
  orderId: string;
  name: string;
  planName: string;
  gameSlug?: string | null;
  ramMb: number;
  cpuPercent: number;
  diskMb: number;
  viewerLabel: string;
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

  const metrics = useMemo(
    () => [
      {
        label: "RAM",
        value: res ? `${Math.round((res.resources.memory_bytes / (ramMb * 1024 * 1024)) * 100)}%` : "0%",
        subvalue: res ? formatBytes(res.resources.memory_bytes) : "--",
        icon: HardDrive,
      },
      {
        label: "CPU",
        value: res ? `${Math.round((res.resources.cpu_absolute / cpuPercent) * 100)}%` : "0%",
        subvalue: res ? `${res.resources.cpu_absolute.toFixed(1)}% used` : "--",
        icon: Cpu,
      },
      {
        label: "SSD",
        value: res ? `${Math.round((res.resources.disk_bytes / (diskMb * 1024 * 1024)) * 100)}%` : "0%",
        subvalue: res ? formatBytes(res.resources.disk_bytes) : "--",
        icon: Gauge,
      },
      {
        label: "NETWORK",
        value: res ? formatBytes(res.resources.network_rx_bytes) : "0 B",
        subvalue: res ? `OUT ${formatBytes(res.resources.network_tx_bytes)}` : "OUT --",
        icon: Network,
      },
      {
        label: "STATUS",
        value: running ? "Live" : state === "starting" ? "Starting" : state === "stopping" ? "Stopping" : "Offline",
        subvalue: running && res ? formatUptime(res.resources.uptime) : planName,
        icon: Activity,
      },
    ],
    [cpuPercent, diskMb, planName, ramMb, res, running, state],
  );

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mb-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-night-100/95 shadow-[0_18px_80px_rgba(2,6,23,0.45)]">
      <div className="border-b border-white/[0.06] bg-black/20 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Logo className="shrink-0" href="/dashboard" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-steel-faint">
                {game && (
                  <>
                    <span className="text-hyper-300">{game.name}</span>
                    <span className="text-steel-faint/70">Server</span>
                  </>
                )}
                {!game && <span>Game Server</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <h1 className="truncate font-display text-2xl font-extrabold italic text-white">
                  {name}
                </h1>
                {address && (
                  <button
                    onClick={copyAddress}
                    className="ring-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-hyper-300 transition-colors hover:border-hyper-400/40"
                  >
                    {address}
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-steel">
                <span>{game?.tagline ?? planName}</span>
                <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
                <span>{viewerLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="ring-focus inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-steel transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-steel">
              <span
                className={cn(
                  "mr-2 inline-block h-2.5 w-2.5 rounded-full",
                  running ? "bg-success shadow-[0_0_12px_rgba(34,197,94,0.85)]" : "bg-steel-faint",
                )}
              />
              {running ? "Live Status" : state === "starting" ? "Starting" : state === "stopping" ? "Stopping" : "Offline"}
            </div>
          </div>
        </div>
      </div>

      <div
        className="border-t border-white/[0.04] bg-cover bg-center"
        style={
          game
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(8,12,20,0.78), rgba(8,12,20,0.92)), url('/games/${game.slug}/hero.jpg')`,
              }
            : undefined
        }
      >
        <div className="grid gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[repeat(4,minmax(0,1fr))_220px]">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/[0.08] bg-night-100/75 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-steel-faint">
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.26em]">
                    {metric.label}
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-xs text-steel">{metric.subvalue}</p>
              </div>
            );
          })}

          <div className="rounded-2xl border border-white/[0.08] bg-night-100/75 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-steel-faint">
              <Timer className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.26em]">
                Service
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-white">
              {game?.name ?? "Server"}
            </p>
            <p className="mt-1 text-xs text-steel">{planName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
