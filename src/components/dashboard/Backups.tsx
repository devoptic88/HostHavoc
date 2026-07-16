"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Download, History, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatBytes, formatDate } from "@/lib/utils";

interface Backup {
  uuid: string;
  name: string;
  bytes: number;
  is_successful: boolean;
  created_at: string;
  completed_at: string | null;
}

export function Backups({ orderId }: { orderId: string }) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${orderId}/backups`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setBackups(data.data.map((d: { attributes: Backup }) => d.attributes));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backups");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/servers/${orderId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError((await res.json()).error ?? "Action failed");
    await load();
    setBusy(false);
  }

  async function download(uuid: string) {
    const res = await fetch(`/api/servers/${orderId}/backup-download?uuid=${uuid}`);
    if (res.ok) window.open((await res.json()).attributes.url, "_blank");
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Archive className="h-4 w-4 text-hyper-400" /> Backups
        </span>
        <Button size="sm" disabled={busy} onClick={() => act("create-backup", {})}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create backup
        </Button>
      </div>
      {error && <p className="px-5 py-3 text-sm text-danger">{error}</p>}
      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-steel-faint">Loading…</p>
      ) : backups.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-steel-faint">
          No backups yet. Create one before making big changes.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {backups.map((b) => (
            <li key={b.uuid} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{b.name}</p>
                <p className="text-xs text-steel-faint">
                  {formatDate(b.created_at)} · {formatBytes(b.bytes)}
                </p>
              </div>
              {!b.completed_at ? (
                <Badge tone="yellow">In progress</Badge>
              ) : b.is_successful ? (
                <Badge tone="green">Complete</Badge>
              ) : (
                <Badge tone="red">Failed</Badge>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" title="Download" onClick={() => download(b.uuid)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Restore"
                  disabled={busy}
                  onClick={() =>
                    act("restore-backup", { uuid: b.uuid }, "Restore this backup? Current files will be overwritten by the backup contents.")
                  }
                >
                  <History className="h-4 w-4 text-warning" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Delete"
                  disabled={busy}
                  onClick={() => act("delete-backup", { uuid: b.uuid }, "Delete this backup permanently?")}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
