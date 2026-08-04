/**
 * Minecraft One-Click Installer catalog (Nodecraft parity piece #2).
 *
 * Each entry resolves a downloadable server jar from the software's public
 * API. Installing = Pterodactyl files/pull of the jar into the server root,
 * then pointing the egg's jar variable at the new file.
 */

export type McSoftware = "vanilla" | "paper" | "purpur" | "fabric";

export type McCatalogEntry = {
  id: McSoftware;
  name: string;
  category: "Vanilla" | "Plugin Framework" | "Modded Framework";
  description: string;
  minRamMb: number;
  supportsPlugins: boolean;
  supportsMods: boolean;
};

export const MC_CATALOG: McCatalogEntry[] = [
  {
    id: "vanilla",
    name: "Vanilla",
    category: "Vanilla",
    description: "Official server JAR released by Mojang.",
    minRamMb: 2048,
    supportsPlugins: false,
    supportsMods: false,
  },
  {
    id: "paper",
    name: "Paper",
    category: "Plugin Framework",
    description:
      "High-performance Spigot fork with an expanded API. The most popular choice for plugin servers.",
    minRamMb: 2048,
    supportsPlugins: true,
    supportsMods: false,
  },
  {
    id: "purpur",
    name: "Purpur",
    category: "Plugin Framework",
    description:
      "Fork of Paper focused on extra configuration options for unique gameplay experiences.",
    minRamMb: 2048,
    supportsPlugins: true,
    supportsMods: false,
  },
  {
    id: "fabric",
    name: "Fabric",
    category: "Modded Framework",
    description: "Lightweight, modular mod loader with a fast-moving ecosystem.",
    minRamMb: 2048,
    supportsPlugins: false,
    supportsMods: true,
  },
];

const VERSION_CACHE_MS = 1000 * 60 * 60;
const versionCache = new Map<McSoftware, { fetchedAt: number; versions: string[] }>();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Upstream ${url} responded ${res.status}`);
  return (await res.json()) as T;
}

async function fetchVersions(software: McSoftware): Promise<string[]> {
  switch (software) {
    case "vanilla": {
      const manifest = await fetchJson<{
        versions: { id: string; type: string }[];
      }>("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
      return manifest.versions.filter((v) => v.type === "release").map((v) => v.id);
    }
    case "paper": {
      // PaperMC "Fill" v3 — versions come grouped by major, newest group first.
      const project = await fetchJson<{ versions: Record<string, string[]> }>(
        "https://fill.papermc.io/v3/projects/paper",
      );
      return Object.values(project.versions)
        .flat()
        .filter((v) => !/-(rc|pre)/i.test(v));
    }
    case "purpur": {
      const project = await fetchJson<{ versions: string[] }>(
        "https://api.purpurmc.org/v2/purpur",
      );
      return [...project.versions].reverse();
    }
    case "fabric": {
      const games = await fetchJson<{ version: string; stable: boolean }[]>(
        "https://meta.fabricmc.net/v2/versions/game",
      );
      return games.filter((g) => g.stable).map((g) => g.version);
    }
  }
}

/** Newest-first list of installable game versions, cached for an hour. */
export async function listMcVersions(software: McSoftware): Promise<string[]> {
  const cached = versionCache.get(software);
  if (cached && Date.now() - cached.fetchedAt < VERSION_CACHE_MS) return cached.versions;
  const versions = await fetchVersions(software);
  versionCache.set(software, { fetchedAt: Date.now(), versions });
  return versions;
}

export type McDownload = {
  url: string;
  fileName: string;
  build?: string;
};

/** Resolve the direct server-jar download for a software + game version. */
export async function resolveMcDownload(
  software: McSoftware,
  version: string,
): Promise<McDownload> {
  switch (software) {
    case "vanilla": {
      const manifest = await fetchJson<{
        versions: { id: string; url: string }[];
      }>("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
      const entry = manifest.versions.find((v) => v.id === version);
      if (!entry) throw new Error(`Unknown Vanilla version: ${version}`);
      const detail = await fetchJson<{
        downloads?: { server?: { url: string } };
      }>(entry.url);
      const url = detail.downloads?.server?.url;
      if (!url) throw new Error(`Vanilla ${version} has no server download`);
      return { url, fileName: `vanilla-${version}.jar` };
    }
    case "paper": {
      const build = await fetchJson<{
        id: number;
        downloads: Record<string, { name: string; url: string }>;
      }>(
        `https://fill.papermc.io/v3/projects/paper/versions/${encodeURIComponent(version)}/builds/latest`,
      );
      const download = build.downloads["server:default"];
      if (!download) throw new Error(`Paper ${version} has no server download`);
      return {
        url: download.url,
        fileName: download.name,
        build: String(build.id),
      };
    }
    case "purpur": {
      const detail = await fetchJson<{ builds: { latest: string } }>(
        `https://api.purpurmc.org/v2/purpur/${encodeURIComponent(version)}`,
      );
      const build = detail.builds.latest;
      return {
        url: `https://api.purpurmc.org/v2/purpur/${encodeURIComponent(version)}/${build}/download`,
        fileName: `purpur-${version}-${build}.jar`,
        build,
      };
    }
    case "fabric": {
      const [loaders, installers] = await Promise.all([
        fetchJson<{ version: string; stable: boolean }[]>(
          "https://meta.fabricmc.net/v2/versions/loader",
        ),
        fetchJson<{ version: string; stable: boolean }[]>(
          "https://meta.fabricmc.net/v2/versions/installer",
        ),
      ]);
      const loader = loaders.find((l) => l.stable)?.version;
      const installer = installers.find((i) => i.stable)?.version;
      if (!loader || !installer) throw new Error("Fabric loader metadata unavailable");
      return {
        url: `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(version)}/${loader}/${installer}/server/jar`,
        fileName: `fabric-${version}-${loader}.jar`,
        build: loader,
      };
    }
  }
}

export function isMcSoftware(value: unknown): value is McSoftware {
  return MC_CATALOG.some((entry) => entry.id === value);
}

/** Heuristic for the egg variable that names the server jar. */
export function isJarFileVariable(variable: { name: string; env_variable: string }) {
  const text = `${variable.name} ${variable.env_variable}`.toUpperCase();
  return text.includes("JAR");
}
