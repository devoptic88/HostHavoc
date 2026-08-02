"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const PLUGINS_PER_PAGE = 10;

type CatalogPlugin = {
  title: string;
  slug: string;
  description: string;
  author: string;
  downloads: number;
  downloadsShortened: string;
  updatedAt: string;
  updatedAtAtom: string;
  latestReleaseVersion: string | null;
  latestReleaseVersionFormatted: string | null;
  categoryTags: string;
  iconUrl: string;
  url: string;
  jsonUrl: string;
  downloadUrl: string;
};

export function OxidePluginInstaller({ orderId }: { orderId: string }) {
  const [pluginUrl, setPluginUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [plugins, setPlugins] = useState<CatalogPlugin[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPages, setCatalogPages] = useState(0);
  const [catalogPagesLoaded, setCatalogPagesLoaded] = useState(0);
  const [catalogComplete, setCatalogComplete] = useState(true);
  const [query, setQuery] = useState("");
  const [listPage, setListPage] = useState(1);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [message, setMessage] = useState("");

  const selectedPlugin = useMemo(
    () => plugins.find((plugin) => plugin.slug === selectedSlug) ?? plugins[0] ?? null,
    [plugins, selectedSlug],
  );

  const filteredPlugins = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return plugins;
    return plugins.filter((plugin) =>
      `${plugin.title} ${plugin.author} ${plugin.description} ${plugin.categoryTags}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [plugins, query]);

  const totalListPages = Math.max(1, Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE));
  const currentListPage = Math.min(listPage, totalListPages);
  const pagedPlugins = useMemo(() => {
    const start = (currentListPage - 1) * PLUGINS_PER_PAGE;
    return filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);
  }, [currentListPage, filteredPlugins]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    const res = await fetch(`/api/servers/${orderId}/plugin-catalog`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogError(data?.error ?? "Failed to load the uMod plugin list");
      setCatalogLoading(false);
      return;
    }

    const items = Array.isArray(data?.items) ? (data.items as CatalogPlugin[]) : [];
    setCatalogTotal(Number(data?.total ?? items.length));
    setCatalogPages(Number(data?.pages ?? 0));
    setCatalogPagesLoaded(Number(data?.pagesLoaded ?? 0));
    setCatalogComplete(Boolean(data?.complete ?? true));
    setPlugins(items);
    setListPage(1);
    setSelectedSlug((current) => current || items[0]?.slug || "");
    setCatalogLoading(false);
  }, [orderId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setListPage(1);
  }, [query]);

  useEffect(() => {
    if (!pagedPlugins.length) return;
    const selectedVisible = pagedPlugins.some((plugin) => plugin.slug === selectedSlug);
    if (!selectedVisible) {
      setSelectedSlug(pagedPlugins[0]?.slug ?? "");
    }
  }, [pagedPlugins, selectedSlug]);

  async function installPlugin(targetUrl?: string) {
    const url = (targetUrl ?? pluginUrl).trim();
    if (!url) {
      setMessage("Paste a direct download URL for a .cs Oxide/uMod plugin first.");
      return;
    }

    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/servers/${orderId}/install-plugin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => null);
    setMessage(
      res.ok
        ? `Plugin installed to ${data?.path ?? "/oxide/plugins"}.`
        : (data?.error ?? "Plugin install failed"),
    );
    if (res.ok) setPluginUrl("");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="border-b border-white/[0.08] px-4 py-3">
          <h2 className="text-base font-semibold text-white">Oxide / uMod Plugin Installer</h2>
          <p className="mt-1 text-xs text-steel-faint">
            Browse the current uMod Rust catalog, inspect a plugin, and install it into `/oxide/plugins` with one click.
          </p>
        </div>
        <div className="border-b border-white/[0.08] px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-white/20 bg-white/[0.06]">
              <div className="px-3 text-steel-faint">
                <Search className="h-4 w-4" />
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the full plugin catalog..."
                className="h-11 border-0 bg-transparent text-sm focus:border-0"
              />
            </div>
            <Button
              size="md"
              variant="secondary"
              className="h-11 rounded-full px-5"
              disabled={catalogLoading}
              onClick={loadCatalog}
            >
              {catalogLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh List
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-steel-faint">
            Source: full uMod Rust catalog, sorted A-Z. HyperNode caches the list briefly so refreshes do not hammer uMod.
          </p>
          {(catalogTotal > 0 || catalogPages > 0) && (
            <p className="mt-1 text-xs leading-5 text-steel-faint">
              Loaded {plugins.length.toLocaleString()} plugins from {catalogPagesLoaded.toLocaleString()} of {catalogPages.toLocaleString()} pages.
            </p>
          )}
          {filteredPlugins.length > 0 && (
            <p className="mt-1 text-xs leading-5 text-steel-faint">
              Showing {pagedPlugins.length.toLocaleString()} plugins on page {currentListPage.toLocaleString()} of {totalListPages.toLocaleString()}.
            </p>
          )}
          {!catalogComplete && (
            <p className="mt-1 text-xs leading-5 text-warning">
              uMod throttled part of the catalog, so this is a partial live list. Refresh again in a bit to load more.
            </p>
          )}
        </div>

        <div className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-2">
            {catalogError && <p className="text-sm text-danger">{catalogError}</p>}
            {catalogLoading && !plugins.length && <p className="text-sm text-steel-faint">Loading current plugin list...</p>}
            {!catalogLoading && !filteredPlugins.length && !catalogError && (
              <p className="text-sm text-steel-faint">No plugins on this page matched your search.</p>
            )}
            {pagedPlugins.map((plugin) => {
              const active = selectedPlugin?.slug === plugin.slug;
              return (
                <button
                  key={plugin.slug}
                  onClick={() => setSelectedSlug(plugin.slug)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    active
                      ? "border-hyper-400/40 bg-hyper-500/10"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-cover bg-center bg-no-repeat"
                      style={plugin.iconUrl ? { backgroundImage: `url('${plugin.iconUrl}')` } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{plugin.title}</p>
                        <ChevronRight className={`h-4 w-4 text-steel-faint transition-transform ${active ? "rotate-90" : ""}`} />
                      </div>
                      <p className="mt-1 text-xs text-steel">by {plugin.author || "Unknown author"}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-steel-faint">{plugin.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredPlugins.length > PLUGINS_PER_PAGE && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentListPage <= 1}
                  onClick={() => setListPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <p className="text-xs text-steel-faint">
                  Page {currentListPage} of {totalListPages}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentListPage >= totalListPages}
                  onClick={() => setListPage((page) => Math.min(totalListPages, page + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            {selectedPlugin ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-cover bg-center bg-no-repeat"
                    style={selectedPlugin.iconUrl ? { backgroundImage: `url('${selectedPlugin.iconUrl}')` } : undefined}
                  />
                  <div className="min-w-0">
                    <p className="text-xl font-semibold text-white">{selectedPlugin.title}</p>
                    <p className="mt-1 text-sm text-steel">by {selectedPlugin.author || "Unknown author"}</p>
                    <p className="mt-1 text-xs text-steel-faint">
                      {selectedPlugin.latestReleaseVersionFormatted || selectedPlugin.latestReleaseVersion || "Version unavailable"}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-steel">{selectedPlugin.description || "No description was provided by uMod."}</p>

                <div className="grid gap-2 text-sm text-steel">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2">
                    <span className="text-steel-faint">Downloads</span>
                    <span className="font-medium text-white">{selectedPlugin.downloadsShortened}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2">
                    <span className="text-steel-faint">Updated</span>
                    <span className="font-medium text-white">{selectedPlugin.updatedAt || "Unknown"}</span>
                  </div>
                  <div className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2">
                    <p className="text-steel-faint">Tags</p>
                    <p className="mt-1 text-sm text-white">{selectedPlugin.categoryTags || "No tags listed"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="md"
                    className="h-11 rounded-full px-5"
                    disabled={busy || !selectedPlugin.downloadUrl}
                    onClick={() => installPlugin(selectedPlugin.downloadUrl)}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Install This Plugin
                  </Button>
                  <a
                    href={selectedPlugin.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ring-focus inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold text-steel transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open on uMod
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-steel-faint">Select a plugin from the list to inspect and install it.</p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="border-b border-white/[0.08] px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Manual Plugin URL</h3>
          <p className="mt-1 text-xs text-steel-faint">
            If a specific uMod download is rate-limited or you have a raw `.cs` file elsewhere, paste the direct file URL here.
          </p>
        </div>
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Input
              value={pluginUrl}
              onChange={(event) => setPluginUrl(event.target.value)}
              placeholder="https://example.com/MyPlugin.cs"
              className="h-11 text-sm"
            />
            <p className="text-xs leading-5 text-steel-faint">
              This works best with raw GitHub, GitLab, or vendor-hosted direct file links. Zip packages are not supported here yet.
            </p>
          </div>
          <Button
            size="md"
            className="h-11 rounded-full px-5"
            disabled={busy}
            onClick={() => installPlugin()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Install from URL
          </Button>
        </div>
      </section>

      {message && <p className="text-sm text-steel">{message}</p>}
    </div>
  );
}
