/**
 * Minecraft plugin catalog, backed by the Spiget API over SpigotMC.
 *
 * SpigotMC hosts two kinds of resource: ones whose jar Spiget can serve
 * directly, and "external" ones that only link out to another site. We can
 * one-click install the former and can only link to the latter — the same
 * split Nodecraft surfaces as "Install" vs "External Download".
 */

const SPIGET = "https://api.spiget.org/v2";
const UA = "HyperNode/1.0 (+https://hypernode.gg)";

export type McPlugin = {
  id: number;
  name: string;
  tag: string;
  downloads: number;
  testedVersions: string[];
  /** External resources link out; only non-external jars can be installed. */
  external: boolean;
  premium: boolean;
  /** Inline data URI so we don't call a third-party image host per row. */
  icon: string | null;
  pageUrl: string;
  externalUrl: string | null;
};

type SpigetResource = {
  id: number;
  name?: string;
  tag?: string;
  downloads?: number;
  testedVersions?: string[];
  external?: boolean;
  premium?: boolean;
  icon?: { data?: string };
  file?: { type?: string; externalUrl?: string };
};

async function spiget<T>(path: string): Promise<T> {
  const res = await fetch(`${SPIGET}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spiget responded ${res.status}`);
  return (await res.json()) as T;
}

function normalize(raw: SpigetResource): McPlugin {
  const external = Boolean(raw.external) || raw.file?.type === "external";
  return {
    id: raw.id,
    name: raw.name ?? `Resource ${raw.id}`,
    tag: raw.tag ?? "",
    downloads: Number(raw.downloads ?? 0),
    testedVersions: Array.isArray(raw.testedVersions) ? raw.testedVersions : [],
    external,
    premium: Boolean(raw.premium),
    icon: raw.icon?.data ? `data:image/png;base64,${raw.icon.data}` : null,
    pageUrl: `https://www.spigotmc.org/resources/${raw.id}`,
    externalUrl: external ? (raw.file?.externalUrl ?? null) : null,
  };
}

const FIELDS = "id,name,tag,downloads,testedVersions,external,premium,icon,file";

/** Most-downloaded free resources, newest catalog page first. */
export async function listPopularPlugins(page = 1, size = 20) {
  const data = await spiget<SpigetResource[]>(
    `/resources/free?size=${size}&page=${page}&sort=-downloads&fields=${FIELDS}`,
  );
  return data.map(normalize);
}

export async function searchPlugins(query: string, page = 1, size = 20) {
  const term = query.trim();
  if (!term) return listPopularPlugins(page, size);
  const data = await spiget<SpigetResource[]>(
    `/search/resources/${encodeURIComponent(term)}?field=name&size=${size}&page=${page}&sort=-downloads&fields=${FIELDS}`,
  );
  return data.map(normalize);
}

export async function getPlugin(id: number) {
  return normalize(await spiget<SpigetResource>(`/resources/${id}?fields=${FIELDS}`));
}

/** Filesystem-safe jar name; the id keeps distinct resources from colliding. */
export function pluginFileName(plugin: Pick<McPlugin, "id" | "name">) {
  const base = plugin.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return `${base || "plugin"}-${plugin.id}.jar`;
}

/**
 * Resolve the real jar URL for a resource.
 *
 * Spiget's /download endpoint 302s to its CDN. We follow that here rather than
 * handing Wings the redirect, because the daemon's pull does not reliably
 * follow one — it happily writes a zero-byte file instead.
 */
export async function resolvePluginDownloadUrl(id: number): Promise<string> {
  const res = await fetch(`${SPIGET}/resources/${id}/download`, {
    headers: { "User-Agent": UA },
    redirect: "manual",
    cache: "no-store",
  });

  const location = res.headers.get("location");
  if (location) {
    return new URL(location, SPIGET).toString();
  }
  if (res.status >= 200 && res.status < 300) {
    // Some resources are served inline with no redirect.
    return `${SPIGET}/resources/${id}/download`;
  }
  throw new Error(`Could not resolve a download for resource ${id} (${res.status})`);
}
