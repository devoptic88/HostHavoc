"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, CreditCard, RadioTower, Shield, Timer } from "lucide-react";
import { gameCapsule, getGame } from "@/content/games";
import { formatBytes, formatMoney, formatUptime } from "@/lib/utils";

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

function truncateText(input: string, max = 20) {
  return input.length > max ? `${input.slice(0, max)}...` : input;
}

export function ServerOverview({
  orderId,
  name,
  planName,
  gameSlug,
  ramMb,
  cpuPercent,
  diskMb,
  priceMonthly,
  orderStatus,
}: {
  orderId: string;
  name: string;
  planName: string;
  gameSlug?: string | null;
  ramMb: number;
  cpuPercent: number;
  diskMb: number;
  priceMonthly: number;
  orderStatus: string;
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
  const gameLogo = game?.slug === "rust" ? "/games/rust/logo.png" : game ? gameCapsule(game.slug) : null;
  const state = res?.current_state ?? "offline";
  const running = state === "running";

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
        <div className="bg-gradient-to-b from-transparent via-night/25 to-night/75 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex min-w-0 items-start gap-3">
                {game && (
                  <div
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-black/25 bg-contain bg-center bg-no-repeat"
                    style={
                      gameLogo
                        ? { backgroundImage: `url('${gameLogo}')` }
                        : { background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})` }
                    }
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-3xl font-black uppercase tracking-tight text-white">
                      {game?.name ?? "Server"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-steel-faint">
                      {running ? "Live" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-steel">
                    <span className="font-semibold text-white">{name}</span>
                    <span>{planName}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(5,minmax(0,1fr))]">
                <TopMetricCard
                  label={`${game?.name ?? "Game"} Server`}
                  value={truncateText(game?.tagline ?? "Live game server management", 20)}
                />
                <TopMetricCard label="RAM" value={`${ramMb} MB`} />
                <TopMetricCard label="CPU" value={`${cpuPercent}%`} />
                <TopMetricCard label="SSD" value={`${diskMb >= 1024 ? `${(diskMb / 1024).toFixed(1)} GB` : `${diskMb} MB`}`} />
                <TopMetricCard label="Players" value="0" />
                <TopMetricCard
                  label="Network"
                  value={res ? `IN ${formatBytes(res.resources.network_rx_bytes)}` : "IN 0 B"}
                  secondary={res ? `OUT ${formatBytes(res.resources.network_tx_bytes)}` : "OUT 0 B"}
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {address && (
                <button
                  onClick={copyAddress}
                  className="ring-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-hyper-300 transition-colors hover:border-hyper-400/40"
                >
                  {address}
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-white">
                {running ? "Server online" : "Server offline"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_1fr]">
        <InfoCard
          icon={<CreditCard className="h-4 w-4" />}
          title="Plan & Subscription"
          body={
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">{planName}</p>
                  <p className="mt-1 text-sm text-steel">
                    {name} is currently <span className="font-semibold text-white">{orderStatus.toLowerCase()}</span>.
                  </p>
                </div>
                <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-hyper-300">
                  {formatMoney(priceMonthly)}/mo
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="RAM" value={`${ramMb} MB`} />
                <MiniStat label="CPU" value={`${cpuPercent}%`} />
                <MiniStat label="SSD" value={`${diskMb} MB`} />
              </div>
            </>
          }
        />

        <InfoCard
          icon={<RadioTower className="h-4 w-4" />}
          title="Connection"
          body={
            <>
              <p className="text-sm text-steel">
                Primary address and quick connection details for your live instance.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-steel-faint">
                    Hostname
                  </p>
                  <p className="mt-1 font-mono text-sm text-white">{address ?? "Pending allocation"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-steel-faint">
                    Product
                  </p>
                  <p className="mt-1 text-sm text-white">{game?.name ?? "Game Server"}</p>
                </div>
              </div>
            </>
          }
        />

        <InfoCard
          icon={<Shield className="h-4 w-4" />}
          title="Server Information"
          body={
            <>
              <div className="space-y-3">
                <DetailRow label="Uptime" value={running && res ? formatUptime(res.resources.uptime) : "Server is offline"} />
                <DetailRow label="State" value={state} />
                <DetailRow label="Network In" value={res ? formatBytes(res.resources.network_rx_bytes) : "0 B"} />
                <DetailRow label="Network Out" value={res ? formatBytes(res.resources.network_tx_bytes) : "0 B"} />
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-steel">
                Need help setting up your server? Open a ticket and we&apos;ll help you tune mods, startup settings, and performance.
              </div>
            </>
          }
        />
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 text-steel-faint">
          <Timer className="h-4 w-4" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-steel-faint">Status Summary</p>
        </div>
        <p className="mt-2 font-mono text-lg font-semibold text-white">
          {running && res ? formatUptime(res.resources.uptime) : "Server is offline"}
        </p>
        <p className="mt-1 text-sm text-steel">
          {running
            ? "Your instance is online and responding to live resource checks."
            : "Start the server from the control sidebar when you're ready to bring it online."}
        </p>
      </div>
    </div>
  );
}

function TopMetricCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-black/20 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-steel-faint">{label}</p>
      <p className="mt-1.5 font-mono text-lg font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-steel">{secondary ?? ""}</p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl border border-white/8 p-5">
      <div className="mb-4 flex items-center gap-2 text-steel-faint">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-[0.26em]">{title}</p>
      </div>
      {body}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-steel-faint">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-steel-faint">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
