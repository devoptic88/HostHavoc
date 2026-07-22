"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Check,
  Copy,
  CreditCard,
  Gamepad2,
  HardDrive,
  Network,
  Search,
  TerminalSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import { gameCapsule, getGame } from "@/content/games";
import { cn, formatBytes, formatMoney, formatUptime } from "@/lib/utils";

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

type MetricPoint = {
  ts: number;
  cpu: number;
  ram: number;
  disk: number;
  players: number;
};

type PerfMetric = "disk" | "ram" | "cpu";
type HistoryRange = "24h" | "3d" | "week" | "month";

const RANGE_LABELS: Record<HistoryRange, string> = {
  "24h": "24 Hours",
  "3d": "3 Days",
  week: "Week",
  month: "Month",
};

const HELP_POINTS = [
  "Always human",
  "Genuinely helpful, expert-level knowledge",
  "Average response time: 5 minutes",
  "Most issues resolved within an hour",
];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function useSessionHistory({
  res,
  ramMb,
  diskMb,
}: {
  res: Resources | null;
  ramMb: number;
  diskMb: number;
}) {
  const [history, setHistory] = useState<MetricPoint[]>([]);

  useEffect(() => {
    if (!res) return;
    const point: MetricPoint = {
      ts: Date.now(),
      cpu: clampPercent(res.resources.cpu_absolute),
      ram: clampPercent((res.resources.memory_bytes / (ramMb * 1024 * 1024)) * 100),
      disk: clampPercent((res.resources.disk_bytes / (diskMb * 1024 * 1024)) * 100),
      players: 0,
    };

    setHistory((current) => {
      const next = [...current, point];
      return next.slice(-24);
    });
  }, [diskMb, ramMb, res]);

  return history;
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
  const [perfMetric, setPerfMetric] = useState<PerfMetric>("ram");
  const [historyRange, setHistoryRange] = useState<HistoryRange>("24h");
  const [playerSearch, setPlayerSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/servers/${orderId}/resources`);
      if (response.ok) setRes(await response.json());
    } catch {
      // transient
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

  const history = useSessionHistory({ res, ramMb, diskMb });
  const game = gameSlug ? getGame(gameSlug) : undefined;
  const gameLogo = game?.slug === "rust" ? "/games/rust/logo.png" : game ? gameCapsule(game.slug) : null;
  const state = res?.current_state ?? "offline";
  const running = state === "running";
  const playerCount = 0;

  const alloc = details?.relationships?.allocations?.data.find((item) => item.attributes.is_default)?.attributes;
  const address = alloc ? `${alloc.ip_alias ?? alloc.ip}:${alloc.port}` : null;

  const historyPoints = useMemo(() => {
    if (history.length === 0) return [];
    const windowSizes: Record<HistoryRange, number> = {
      "24h": 24,
      "3d": 18,
      week: 14,
      month: 12,
    };
    return history.slice(-windowSizes[historyRange]);
  }, [history, historyRange]);

  const heroStyle = game
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(6,10,18,0.96) 0%, rgba(6,10,18,0.82) 55%, rgba(6,10,18,0.94) 100%), url('/games/${game.slug}/hero.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-night-100 shadow-xl" style={heroStyle}>
        <div className="bg-gradient-to-b from-transparent via-night/25 to-night/75 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex min-w-0 items-start gap-3">
                {game ? (
                  <div
                    className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-black/25 bg-contain bg-center bg-no-repeat"
                    style={
                      gameLogo
                        ? { backgroundImage: `url('${gameLogo}')` }
                        : { background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})` }
                    }
                  />
                ) : null}
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

              <div className="grid grid-cols-[minmax(150px,1.35fr)_repeat(5,minmax(72px,1fr))] gap-2 xl:grid-cols-[minmax(180px,1.5fr)_repeat(5,minmax(86px,1fr))]">
                <TopMetricCard
                  label={`${game?.name ?? "Game"} Server`}
                  value={game?.tagline ?? "Live game server management"}
                  compact
                />
                <TopMetricCard label="RAM" value={`${ramMb} MB`} />
                <TopMetricCard label="CPU" value={`${cpuPercent}%`} />
                <TopMetricCard label="SSD" value={diskMb >= 1024 ? `${(diskMb / 1024).toFixed(1)} GB` : `${diskMb} MB`} />
                <TopMetricCard label="Players" value={String(playerCount)} />
                <TopMetricCard
                  label="Network"
                  value={res ? `IN ${formatBytes(res.resources.network_rx_bytes)}` : "IN 0 B"}
                  secondary={res ? `OUT ${formatBytes(res.resources.network_tx_bytes)}` : "OUT 0 B"}
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {address ? (
                <button
                  onClick={copyAddress}
                  className="ring-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-hyper-300 transition-colors hover:border-hyper-400/40"
                >
                  {address}
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              ) : null}
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-white">
                {running ? "Server online" : "Server offline"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <OverviewPanel
          icon={HardDrive}
          title="Server Performance"
          actions={
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { id: "disk", label: "SSD", tone: "text-warning" },
                { id: "ram", label: "RAM", tone: "text-success" },
                { id: "cpu", label: "CPU", tone: "text-hyper-300" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPerfMetric(option.id as PerfMetric)}
                  className={cn(
                    "rounded-full px-2.5 py-1 transition-colors",
                    perfMetric === option.id ? "bg-white/10 text-white" : option.tone,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          <LineChart
            points={historyPoints}
            metric={perfMetric}
            colorClass={perfMetric === "ram" ? "stroke-success" : perfMetric === "disk" ? "stroke-warning" : "stroke-hyper-300"}
            fillClass={perfMetric === "ram" ? "fill-success/20" : perfMetric === "disk" ? "fill-warning/15" : "fill-hyper-500/15"}
            emptyText="Live resource history will build as this page remains open."
          />
        </OverviewPanel>

        <OverviewPanel
          icon={Users}
          title="Player History"
          actions={
            <div className="flex flex-wrap gap-2 text-xs">
              {(Object.keys(RANGE_LABELS) as HistoryRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setHistoryRange(range)}
                  className={cn(
                    "rounded-full px-2.5 py-1 transition-colors",
                    historyRange === range ? "bg-hyper-500/15 text-hyper-300" : "text-steel-faint hover:text-white",
                  )}
                >
                  {RANGE_LABELS[range]}
                </button>
              ))}
            </div>
          }
        >
          <LineChart
            points={historyPoints}
            metric="players"
            colorClass="stroke-hyper-300"
            fillClass="fill-hyper-500/10"
            maxValue={10}
            emptyText="Player history will appear here as sessions are observed."
          />
        </OverviewPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
        <OverviewPanel icon={BookOpenText} title="Need Help?">
          <div className="space-y-3 text-sm text-steel">
            <p>
              Whether you want to find information in the HyperNode knowledgebase, pick our brains, or get hands-on service, we are here to help.
            </p>
            <ul className="space-y-2">
              {HELP_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-hyper-300" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-steel-faint">
                Search Rust knowledgebase
              </div>
              <Link
                href={`/dashboard/tickets?server=${orderId}`}
                className="ring-focus inline-flex items-center justify-center rounded-xl border border-hyper-400/30 bg-hyper-500/10 px-4 py-3 text-sm font-semibold text-hyper-300 transition-colors hover:bg-hyper-500/20"
              >
                Get Help
              </Link>
            </div>
          </div>
        </OverviewPanel>

        <OverviewPanel
          icon={Users}
          title="Players"
          actions={
            <div className="relative w-full max-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-faint" />
              <input
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Search players"
                className="ring-focus w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-steel-faint"
              />
            </div>
          }
        >
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-6 text-center">
            <Gamepad2 className="h-14 w-14 text-steel-faint" />
            <p className="mt-5 text-2xl font-semibold text-white">No players online.</p>
            <p className="mt-2 max-w-sm text-sm text-steel-dim">
              Once players connect to your server, they will appear here.
            </p>
            <button className="ring-focus mt-6 rounded-full bg-hyper-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition-all hover:brightness-110">
              How to Join your Server
            </button>
          </div>
        </OverviewPanel>

        <div className="space-y-4">
          <OverviewPanel icon={CreditCard} title="Plan & Subscription">
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
            <div className="mt-4 grid gap-3">
              <MiniStat label="RAM" value={`${ramMb} MB`} />
              <MiniStat label="CPU" value={`${cpuPercent}%`} />
              <MiniStat label="SSD" value={`${diskMb} MB`} />
            </div>
          </OverviewPanel>

          <OverviewPanel icon={Network} title="Connection">
            <div className="space-y-3">
              <DetailRow label="Hostname" value={address ?? "Pending allocation"} mono />
              <DetailRow label="Uptime" value={running && res ? formatUptime(res.resources.uptime) : "Server is offline"} />
              <DetailRow label="Network In" value={res ? formatBytes(res.resources.network_rx_bytes) : "0 B"} />
              <DetailRow label="Network Out" value={res ? formatBytes(res.resources.network_tx_bytes) : "0 B"} />
              <Link
                href={`/dashboard/servers/${orderId}/console`}
                className="ring-focus inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-steel transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <TerminalSquare className="h-4 w-4" />
                Open Console
              </Link>
            </div>
          </OverviewPanel>
        </div>
      </div>
    </div>
  );
}

function TopMetricCard({
  label,
  value,
  secondary,
  compact,
}: {
  label: string;
  value: string;
  secondary?: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-white/[0.08] bg-black/20 px-2.5 py-2.5 backdrop-blur-sm sm:px-3">
      <p className="truncate text-[9px] font-bold uppercase tracking-[0.22em] text-steel-faint sm:text-[10px] sm:tracking-[0.26em]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 min-w-0 font-mono font-semibold text-white",
          compact ? "line-clamp-2 text-sm leading-snug sm:text-base" : "truncate text-base sm:text-lg",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-steel sm:text-[11px]">{secondary ?? ""}</p>
    </div>
  );
}

function OverviewPanel({
  icon: Icon,
  title,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl border border-white/[0.08] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2 text-white">
          <Icon className="h-5 w-5 text-steel-faint" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function LineChart({
  points,
  metric,
  colorClass,
  fillClass,
  maxValue = 100,
  emptyText,
}: {
  points: MetricPoint[];
  metric: keyof MetricPoint;
  colorClass: string;
  fillClass: string;
  maxValue?: number;
  emptyText: string;
}) {
  const width = 640;
  const height = 240;
  const padding = 18;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  const values = points.map((point) => Number(point[metric]));
  const effectiveMax = Math.max(maxValue, ...values, 1);

  const polyline = points
    .map((point, index) => {
      const x = padding + (chartWidth * index) / Math.max(points.length - 1, 1);
      const y = height - padding - (chartHeight * Number(point[metric])) / effectiveMax;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPath =
    points.length > 0
      ? `${polyline} ${padding + chartWidth},${height - padding} ${padding},${height - padding}`
      : "";

  return (
    <div className="rounded-xl border border-white/10 bg-night-100/70 p-4">
      <div className="mb-3 grid grid-cols-6 gap-2 text-[11px] text-steel-faint">
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index}>{Math.round((effectiveMax / 5) * (5 - index))}</span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
          {Array.from({ length: 5 }).map((_, index) => {
            const y = padding + (chartHeight * index) / 4;
            return (
              <line
                key={index}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                className="stroke-white/10"
                strokeWidth="1"
              />
            );
          })}
          {points.length > 0 ? (
            <>
              <polygon points={fillPath} className={fillClass} />
              <polyline
                points={polyline}
                fill="none"
                className={colorClass}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}
        </svg>
        {points.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-steel-faint">
            {emptyText}
          </div>
        ) : null}
      </div>
    </div>
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

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-steel-faint">{label}</p>
      <p className={cn("mt-1 text-sm text-white", mono && "font-mono")}>{value}</p>
    </div>
  );
}
