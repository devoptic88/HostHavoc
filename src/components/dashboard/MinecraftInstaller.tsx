"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Info, PackageCheck, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
type CatalogEntry = {
  id: string;
  name: string;
  category: "Vanilla" | "Plugin Framework" | "Modded Framework";
  description: string;
  minRamMb: number;
  supportsPlugins: boolean;
  supportsMods: boolean;
  versions: string[];
  durable: boolean;
  eggName: string | null;
};

const CATEGORY_ORDER = ["Vanilla", "Plugin Framework", "Modded Framework"] as const;

export function MinecraftInstaller({ orderId }: { orderId: string }) {
  const [entries, setEntries] = useState<CatalogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-catalog`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load catalog");
      setEntries(data.entries);
      const defaults: Record<string, string> = {};
      for (const entry of data.entries as CatalogEntry[]) {
        if (entry.versions.length > 0) defaults[entry.id] = entry.versions[0];
      }
      setSelected(defaults);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load catalog");
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!entries) return [];
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: entries.filter((entry) => entry.category === category),
    })).filter((group) => group.items.length > 0);
  }, [entries]);

  async function install(entry: CatalogEntry) {
    const version = selected[entry.id];
    if (!version) return;
    const warning = entry.durable
      ? `Install ${entry.name} ${version}? Your server will reinstall onto the ${entry.eggName} egg. Worlds and configs are kept, but take a backup first if unsure.`
      : `Install ${entry.name} ${version}? The new jar downloads alongside your current files — worlds and configs are untouched — but a later "Reinstall Server" will revert to your original software.`;
    if (!confirm(warning)) return;
    setBusyId(entry.id);
    setResult(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ software: entry.id, version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Install failed");
      setResult({
        ok: true,
        text:
          data.strategy === "egg"
            ? `${entry.name} ${version} — ${data.note}`
            : `${entry.name} ${version}${data.build ? ` (build ${data.build})` : ""} is downloading as ${data.fileName}. ${
                data.jarVariable
                  ? "The startup jar has been updated — restart the server once the download finishes."
                  : "Set your startup jar variable to this file, then restart."
              }`,
      });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Install failed" });
    } finally {
      setBusyId(null);
    }
  }

  if (loadError) {
    return (
      <div className="glass rounded-2xl border-warning/20 p-6">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Catalog unavailable</h2>
        </div>
        <p className="mt-2 max-w-xl text-sm text-steel-dim">{loadError}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {result && (
        <div
          className={cn(
            "glass flex items-start gap-3 rounded-2xl p-4",
            result.ok ? "border-success/25" : "border-danger/25",
          )}
        >
          {result.ok ? (
            <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          )}
          <p className="text-sm text-steel">{result.text}</p>
          {result.ok && (
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() =>
                fetch(`/api/servers/${orderId}/power`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ signal: "restart" }),
                })
              }
            >
              <RotateCw className="h-3.5 w-3.5" /> Restart
            </Button>
          )}
        </div>
      )}

      <div className="glass flex items-start gap-3 rounded-2xl border-white/[0.08] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-steel-dim" />
        <p className="text-xs text-steel-faint">
          Your worlds, configs, and plugins are kept when switching software — but take a backup
          first if you&apos;re unsure. Options marked{" "}
          <span className="text-steel">Reinstall reverts</span> are installed as a jar alongside
          your files, so a later <span className="text-steel">Reinstall Server</span> will restore
          the software your server was created with.
        </p>
      </div>

      {!entries ? (
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-steel-dim">Loading catalog…</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.category}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-steel-faint">
              {group.category}
            </h2>
            <div className="space-y-3">
              {group.items.map((entry) => (
                <div
                  key={entry.id}
                  className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{entry.name}</p>
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-steel-dim">
                        Min RAM {Math.round(entry.minRamMb / 1024)} GB
                      </span>
                      {entry.supportsPlugins && (
                        <span className="rounded-md bg-hyper-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-hyper-300">
                          Plugins
                        </span>
                      )}
                      {entry.supportsMods && (
                        <span className="rounded-md bg-hyper-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-hyper-300">
                          Mods
                        </span>
                      )}
                      {!entry.durable && (
                        <span
                          className="rounded-md bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
                          title="Installed as a jar — a later Reinstall Server reverts to your original software."
                        >
                          Reinstall reverts
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-xl text-xs text-steel-faint">{entry.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Select
                      value={selected[entry.id] ?? ""}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [entry.id]: e.target.value }))
                      }
                      className="w-40"
                      disabled={entry.versions.length === 0}
                    >
                      {entry.versions.length === 0 ? (
                        <option value="">Unavailable</option>
                      ) : (
                        entry.versions.map((version) => (
                          <option key={version} value={version}>
                            {version}
                          </option>
                        ))
                      )}
                    </Select>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId !== null || entry.versions.length === 0}
                      onClick={() => install(entry)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {busyId === entry.id ? "Installing…" : "Install"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
