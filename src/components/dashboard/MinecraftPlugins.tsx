"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Info,
  Puzzle,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { McPlugin } from "@/lib/minecraftPlugins";

type Tab = "installed" | "browse";

type Installed = { name: string; size: number; modified: string };

export function MinecraftPlugins({ orderId }: { orderId: string }) {
  const [tab, setTab] = useState<Tab>("browse");
  const [installed, setInstalled] = useState<Installed[] | null>(null);
  const [supported, setSupported] = useState(true);
  const [plugins, setPlugins] = useState<McPlugin[] | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadInstalled = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-plugins`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to list plugins");
      setInstalled(data.installed);
      setSupported(data.supported);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list plugins");
    }
  }, [orderId]);

  const loadCatalog = useCallback(
    async (q: string, p: number) => {
      setError(null);
      setPlugins(null);
      try {
        const res = await fetch(
          `/api/servers/${orderId}/mc-plugin-catalog?q=${encodeURIComponent(q)}&page=${p}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load the plugin catalog");
        setPlugins(data.plugins);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load the plugin catalog");
      }
    },
    [orderId],
  );

  useEffect(() => {
    loadInstalled();
  }, [loadInstalled]);

  useEffect(() => {
    loadCatalog(query, page);
    // Re-runs on page change; search is submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function install(plugin: McPlugin) {
    setBusyId(String(plugin.id));
    setMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-plugin-install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId: plugin.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Install failed");
      setMsg({ ok: true, text: data.note });
      loadInstalled();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Install failed" });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(name: string) {
    if (!confirm(`Delete ${name} from /plugins? Its config folder is left in place.`)) return;
    setBusyId(name);
    setMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-plugin-remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Remove failed");
      setMsg({ ok: true, text: data.note });
      loadInstalled();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Remove failed" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {!supported && (
        <div className="glass flex items-start gap-3 rounded-2xl border-warning/25 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs text-steel-faint">
            This server has no <span className="text-steel">/plugins</span> folder, which usually
            means it isn&apos;t running a plugin platform. Install{" "}
            <span className="text-steel">Paper</span> or{" "}
            <span className="text-steel">Purpur</span> from the One-Click Installer first — Vanilla
            and Fabric servers can&apos;t load Spigot plugins.
          </p>
        </div>
      )}

      <div className="glass rounded-2xl p-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "browse", label: "Browse" },
              { id: "installed", label: "Installed" },
            ] as { id: Tab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "ring-focus rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                tab === item.id
                  ? "bg-hyper-500/15 text-hyper-300 ring-1 ring-inset ring-hyper-400/30"
                  : "text-steel-dim hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {item.label}
              {item.id === "installed" && installed && (
                <span className="ml-2 text-xs text-steel-faint">{installed.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div
          className={cn(
            "glass rounded-2xl p-4 text-sm",
            msg.ok ? "border-success/25 text-steel" : "border-danger/25 text-danger",
          )}
        >
          {msg.text}
        </div>
      )}

      {tab === "browse" ? (
        <div className="glass space-y-4 rounded-2xl p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              loadCatalog(query, 1);
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="min-w-[14rem] flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SpigotMC — e.g. EssentialsX, WorldEdit"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              <Search className="h-3.5 w-3.5" /> Search
            </Button>
          </form>

          <div className="flex items-start gap-2 text-xs text-steel-faint">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Some SpigotMC resources are hosted on the author&apos;s own site and can&apos;t be
              installed automatically — those show a link out instead.
            </p>
          </div>

          {error ? (
            <div className="text-sm text-danger">{error}</div>
          ) : !plugins ? (
            <p className="text-sm text-steel-dim">Loading plugins…</p>
          ) : plugins.length === 0 ? (
            <p className="text-sm text-steel-faint">No plugins matched that search.</p>
          ) : (
            <div className="space-y-3">
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.06] p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {plugin.icon ? (
                      // Inline base64 from Spiget — no third-party image host.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={plugin.icon}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06] object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                        <Puzzle className="h-4 w-4 text-steel-faint" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{plugin.name}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-steel-faint">
                          {plugin.downloads.toLocaleString()} downloads
                        </span>
                        {plugin.testedVersions.length > 0 && (
                          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-steel-dim">
                            {plugin.testedVersions[plugin.testedVersions.length - 1]}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-steel-faint">{plugin.tag}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {plugin.external || plugin.premium ? (
                      <a
                        href={plugin.externalUrl ?? plugin.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ring-focus inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-steel-dim transition-colors hover:bg-white/[0.05] hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {plugin.premium ? "Paid resource" : "External download"}
                      </a>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => install(plugin)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {busyId === String(plugin.id) ? "Installing…" : "Install"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-steel-faint">Page {page}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={plugins.length === 0}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass space-y-4 rounded-2xl p-6">
          <div>
            <h2 className="text-sm font-semibold text-white">Installed plugins</h2>
            <p className="mt-0.5 text-xs text-steel-faint">
              Jars in <span className="font-mono">/plugins</span>. Restart the server after adding
              or removing one.
            </p>
          </div>
          {!installed ? (
            <p className="text-sm text-steel-dim">Loading…</p>
          ) : installed.length === 0 ? (
            <p className="text-sm text-steel-faint">No plugins installed yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06]">
              {installed.map((file) => (
                <div key={file.name} className="flex items-center gap-3 px-4 py-3">
                  <Puzzle className="h-4 w-4 shrink-0 text-steel-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{file.name}</p>
                    <p className="text-[11px] text-steel-faint">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId !== null}
                    onClick={() => remove(file.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
