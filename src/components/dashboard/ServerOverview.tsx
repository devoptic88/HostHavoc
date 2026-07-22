"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Cpu, Gauge as GaugeIcon, HardDrive, Network } from "lucide-react";
import { getGame } from "@/content/games";
import { formatBytes, formatUptime } from "@/lib/utils";

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

export function ServerOverview({
  orderId,
  name,
  planName,
  gameSlug,
  ramMb,
  cpuPercent,
  diskMb,
}: {
  orderId: string;
  name: string;
  planName: string;
  gameSlug?: string | null;
  ramMb: number;
  cpuPercent: number;
  diskMb: number;
}) {
  const [res, setRes] = useState<Resources | null>(null);
  const [details, setDetails] = useState<ClientServer | null>(null);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    fetch(`/api/servers/${orderId}/details`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDetails(d))
      .catch(() => {});
  }, [orderId]);

  const game = gameSlug ? getGame(gameSlug) : undefined;
  const state = res?.current_state ?? "offline";
  const running = state === "running";

  const memPct = res ? Math.min(100, (res.resources.memory_bytes / (ramMb * 1024 * 1024)) * 100) : 0;
  const cpuPct = res ? Math.min(100, (res.resources.cpu_absolute / cpuPercent) * 100) : 0;
  const diskPct = res ? Math.min(100, (res.resources.disk_bytes / (diskMb * 1024 * 1024)) * 100) : 0;

  const alloc = details?.relationships?.allocations?.data.find((a) => a.attributes.is_default)
    ?.attributes;
  const address = alloc ? `${alloc.ip_alias ?? alloc.ip}:${alloc.port}` : null;

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const heroStyle = game
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(6,10,18,0.96) 0%, rgba(6,10,18,0.82) 55%, rgba(6,10,18,0.94) 100%), url('/games/${game.slug}/hero.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div
        className="overflow-hidden rounded-2xl border border-white/10 bg-night-100 shadow-xl"
        style={heroStyle}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-b from-transparent via-night/30 to-night/70 p-6">
          <div>
            {game && (
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-sm font-black uppercase tracking-[0.28em] text-white"
                  style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})` }}
                >
                  {game.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-steel-faint">
                    {game.name} Server
                  </p>
                  <p className="text-sm text-steel">{game.tagline}</p>
                </div>
              </div>
            )}
            <h1 className="font-display text-2xl font-extrabold italic text-white">{name}</h1>
            <p className="mt-1 text-sm text-steel-faint">{planName}</p>

            {address && (
              <button
                onClick={copyAddress}
                className="ring-focus mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-hyper-300 transition-colors hover:border-hyper-400/40"
              >
                {address}
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Dial icon={<HardDrive className="h-4 w-4" />} label="RAM" pct={memPct} value={res ? formatBytes(res.resources.memory_bytes) : "--"} />
        <Dial icon={<Cpu className="h-4 w-4" />} label="CPU" pct={cpuPct} value={res ? `${res.resources.cpu_absolute.toFixed(1)}%` : "--"} />
        <Dial icon={<GaugeIcon className="h-4 w-4" />} label="Disk" pct={diskPct} value={res ? formatBytes(res.resources.disk_bytes) : "--"} />
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 text-steel-faint">
            <Network className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Network</p>
          </div>
          <div className="mt-3 space-y-1 font-mono text-sm text-white">
            <p>
              <span className="text-steel-faint">IN</span>{" "}
              {res ? formatBytes(res.resources.network_rx_bytes) : "--"}
            </p>
            <p>
              <span className="text-steel-faint">OUT</span>{" "}
              {res ? formatBytes(res.resources.network_tx_bytes) : "--"}
            </p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-steel-faint">Uptime</p>
        <p className="mt-1 font-mono text-lg font-semibold text-white">
          {running && res ? formatUptime(res.resources.uptime) : "Server is offline"}
        </p>
      </div>
    </div>
  );
}

function Dial({
  icon,
  label,
  pct,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  value: string;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="glass flex flex-col items-center rounded-2xl p-4">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {Math.round(pct)}%
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-steel-faint">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-1 font-mono text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
