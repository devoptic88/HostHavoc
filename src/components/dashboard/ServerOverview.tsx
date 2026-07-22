"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { getGame } from "@/content/games";
import { formatUptime } from "@/lib/utils";

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

      <div className="glass rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-steel-faint">Uptime</p>
        <p className="mt-1 font-mono text-lg font-semibold text-white">
          {running && res ? formatUptime(res.resources.uptime) : "Server is offline"}
        </p>
      </div>
    </div>
  );
}
