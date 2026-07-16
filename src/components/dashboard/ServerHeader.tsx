"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, RotateCw, Skull, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatBytes, formatUptime } from "@/lib/utils";

interface Resources {
  current_state: string;
  resources: {
    memory_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    uptime: number;
  };
}

export function ServerHeader({
  orderId,
  name,
  planName,
}: {
  orderId: string;
  name: string;
  planName: string;
}) {
  const [res, setRes] = useState<Resources | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/servers/${orderId}/resources`);
      if (r.ok) {
        const data = await r.json();
        setRes(data.attributes);
      }
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
    await fetch(`/api/servers/${orderId}/power`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal }),
    });
    setTimeout(() => {
      refresh();
      setBusy(false);
    }, 1200);
  }

  const state = res?.current_state ?? "offline";
  const running = state === "running";

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold italic text-white">
              {name}
            </h1>
            <StatusBadge status={state} />
          </div>
          <p className="mt-1 text-sm text-steel-faint">{planName}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={busy || running} onClick={() => power("start")}>
            <Play className="h-4 w-4 text-success" /> Start
          </Button>
          <Button size="sm" variant="secondary" disabled={busy || !running} onClick={() => power("restart")}>
            <RotateCw className="h-4 w-4 text-warning" /> Restart
          </Button>
          <Button size="sm" variant="secondary" disabled={busy || state === "offline"} onClick={() => power("stop")}>
            <Square className="h-4 w-4 text-danger" /> Stop
          </Button>
          <Button size="sm" variant="ghost" disabled={busy || state === "offline"} onClick={() => power("kill")} title="Force kill">
            <Skull className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
        <Stat label="CPU" value={res ? `${res.resources.cpu_absolute.toFixed(1)}%` : "—"} />
        <Stat label="Memory" value={res ? formatBytes(res.resources.memory_bytes) : "—"} />
        <Stat label="Disk" value={res ? formatBytes(res.resources.disk_bytes) : "—"} />
        <Stat label="Uptime" value={res && running ? formatUptime(res.resources.uptime) : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-steel-faint">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
