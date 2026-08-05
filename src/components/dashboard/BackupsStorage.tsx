"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Info,
  Loader2,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatBytes } from "@/lib/utils";

interface BackupRow {
  uuid: string;
  name: string;
  bytes: number;
  locked: boolean;
  createdAt: string;
}

interface ServerGroup {
  orderId: string;
  serverName: string;
  gameSlug: string | null;
  bytes: number;
  backups: BackupRow[];
  error: string | null;
}

interface Payload {
  servers: ServerGroup[];
  usedBytes: number;
  quotaBytes: number;
}

export function BackupsStorage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/account/backups");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Failed to load backups");
      setData(payload);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load backups");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return data.servers;
    return data.servers
      .map((group) => ({
        ...group,
        backups: group.backups.filter(
          (backup) =>
            backup.name.toLowerCase().includes(term) ||
            group.serverName.toLowerCase().includes(term),
        ),
      }))
      .filter((group) => group.backups.length > 0);
  }, [data, search]);

  function toggleSelected(orderId: string, uuid: string) {
    setSelected((prev) => {
      const next = new Set(prev[orderId] ?? []);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return { ...prev, [orderId]: next };
    });
  }

  function selectAll(group: ServerGroup) {
    setSelected((prev) => {
      const current = prev[group.orderId] ?? new Set<string>();
      const allSelected = group.backups.every((backup) => current.has(backup.uuid));
      return {
        ...prev,
        [group.orderId]: allSelected
          ? new Set<string>()
          : new Set(group.backups.map((backup) => backup.uuid)),
      };
    });
  }

  async function act(orderId: string, path: string, body: Record<string, unknown>, label: string) {
    setBusy(`${orderId}:${JSON.stringify(body)}`);
    setMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? `${label} failed`);
      await load();
      setMsg({ ok: true, text: `${label} complete.` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : `${label} failed` });
    } finally {
      setBusy(null);
    }
  }

  async function download(orderId: string, uuid: string) {
    setBusy(`${orderId}:${uuid}:download`);
    setMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/backup-download?uuid=${uuid}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Could not get a download link");
      window.open(payload.attributes.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Download failed" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteSelected(group: ServerGroup) {
    const uuids = Array.from(selected[group.orderId] ?? []);
    if (uuids.length === 0) return;
    if (
      !confirm(
        `Delete ${uuids.length} backup${uuids.length === 1 ? "" : "s"} from ${group.serverName}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(`${group.orderId}:bulk`);
    setMsg(null);
    try {
      for (const uuid of uuids) {
        const res = await fetch(`/api/servers/${group.orderId}/delete-backup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? "Delete failed");
        }
      }
      setSelected((prev) => ({ ...prev, [group.orderId]: new Set() }));
      await load();
      setMsg({ ok: true, text: `Deleted ${uuids.length} backup${uuids.length === 1 ? "" : "s"}.` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Delete failed" });
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <div className="glass rounded-2xl border-warning/20 p-6">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Backups unavailable</h2>
        </div>
        <p className="mt-2 max-w-xl text-sm text-steel-dim">{loadError}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass rounded-2xl p-6">
        <p className="flex items-center gap-2 text-sm text-steel-dim">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading backups…
        </p>
      </div>
    );
  }

  const percent = data.quotaBytes ? (data.usedBytes / data.quotaBytes) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6">
        <p className="font-display text-2xl font-bold text-white">
          {formatBytes(data.usedBytes)}
          <span className="text-steel-faint">/{formatBytes(data.quotaBytes)}</span>{" "}
          <span className="text-base text-steel-dim">({percent.toFixed(2)}%)</span>
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-hyper-gradient"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      </div>

      <div className="glass flex items-start gap-3 rounded-2xl p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-hyper-300" />
        <p className="text-sm text-steel-dim">
          When storage is full, your oldest backups auto-delete to make room. Lock important
          backups to protect them. Canceled accounts retain backups for 45 days.
        </p>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search backups"
      />

      {msg && (
        <p className={cn("text-sm", msg.ok ? "text-steel" : "text-danger")}>{msg.text}</p>
      )}

      {groups.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-sm text-steel-dim">
            {search ? "No backups match that search." : "No backups yet."}
          </p>
        </div>
      ) : (
        groups.map((group) => {
          const open = openGroups[group.orderId] ?? false;
          const groupSelection = selected[group.orderId] ?? new Set<string>();
          const allSelected =
            group.backups.length > 0 &&
            group.backups.every((backup) => groupSelection.has(backup.uuid));

          return (
            <div key={group.orderId} className="glass overflow-hidden rounded-2xl">
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => ({ ...prev, [group.orderId]: !open }))
                }
                className="ring-focus flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {group.serverName}
                  </span>
                  <span className="text-xs text-steel-faint">
                    {group.backups.length} backup{group.backups.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="font-display text-lg font-bold text-white">
                  {formatBytes(group.bytes)}
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-steel-dim transition-transform", open && "rotate-180")}
                />
              </button>

              {open && (
                <div className="border-t border-white/[0.06]">
                  {group.error ? (
                    <p className="px-5 py-4 text-sm text-danger">{group.error}</p>
                  ) : group.backups.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-steel-faint">No backups for this server.</p>
                  ) : (
                    <>
                      <div className="scrollbar-slim max-h-[22rem] overflow-y-auto">
                        {group.backups.map((backup) => (
                          <div
                            key={backup.uuid}
                            className="flex flex-wrap items-center gap-3 border-b border-white/[0.04] px-5 py-3 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={groupSelection.has(backup.uuid)}
                              onChange={() => toggleSelected(group.orderId, backup.uuid)}
                              aria-label={`Select ${backup.name}`}
                              className="h-4 w-4 shrink-0 accent-hyper-500"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-white">
                              {backup.name}
                              {backup.locked && (
                                <Lock className="ml-2 inline h-3 w-3 text-warning" />
                              )}
                            </span>
                            <span className="shrink-0 font-mono text-xs text-steel-faint">
                              {new Date(backup.createdAt).toLocaleString()}
                            </span>
                            <span className="w-20 shrink-0 text-right text-sm text-steel">
                              {formatBytes(backup.bytes)}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                title="Download"
                                disabled={busy !== null}
                                onClick={() => download(group.orderId, backup.uuid)}
                                className="ring-focus rounded-lg p-1.5 text-steel-dim transition-colors hover:bg-white/[0.06] hover:text-hyper-300 disabled:opacity-40"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title={backup.locked ? "Unlock backup" : "Lock backup"}
                                disabled={busy !== null}
                                onClick={() =>
                                  act(
                                    group.orderId,
                                    "lock-backup",
                                    { uuid: backup.uuid },
                                    backup.locked ? "Unlock" : "Lock",
                                  )
                                }
                                className="ring-focus rounded-lg p-1.5 text-steel-dim transition-colors hover:bg-white/[0.06] hover:text-warning disabled:opacity-40"
                              >
                                {backup.locked ? (
                                  <LockOpen className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                disabled={busy !== null || backup.locked}
                                onClick={() => {
                                  if (
                                    confirm(`Delete ${backup.name}? This cannot be undone.`)
                                  ) {
                                    act(
                                      group.orderId,
                                      "delete-backup",
                                      { uuid: backup.uuid },
                                      "Delete",
                                    );
                                  }
                                }}
                                className="ring-focus rounded-lg p-1.5 text-steel-dim transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-5 py-3">
                        <Button variant="ghost" size="sm" onClick={() => selectAll(group)}>
                          {allSelected ? "Clear selection" : "Select all"}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={groupSelection.size === 0 || busy !== null}
                          onClick={() => deleteSelected(group)}
                        >
                          {busy === `${group.orderId}:bulk` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete selected
                        </Button>
                        {groupSelection.size > 0 && (
                          <span className="text-xs text-steel-faint">
                            {groupSelection.size} selected
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
