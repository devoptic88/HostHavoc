/**
 * Minecraft One-Click Installer catalog (Nodecraft parity piece #2).
 *
 * Two install strategies, picked per software:
 *
 *  - "egg": the panel has a dedicated egg for this software, so we switch the
 *    server's egg + environment and reinstall. This is durable — a later
 *    "Reinstall Server" re-runs the *new* software's install script.
 *  - "jar": no egg exists, so we download the jar next to the existing files
 *    and repoint the startup jar variable. Works immediately, but a later
 *    reinstall re-runs the original egg's script and reverts the software.
 */

import { pteroApp } from "@/lib/pterodactyl";
import type { AppEgg } from "@/lib/pterodactyl";

export type McSoftware = "vanilla" | "paper" | "purpur" | "fabric" | "forge";

type EggInstall = {
  kind: "egg";
  /** Lowercase keywords matched against egg names in the Minecraft nest. */
  eggMatch: string[];
  /** Egg variables to set for the chosen game version. */
  env: (version: string) => Record<string, string>;
};

type JarInstall = { kind: "jar" };

export type McCatalogEntry = {
  id: McSoftware;
  name: string;
  category: "Vanilla" | "Plugin Framework" | "Modded Framework";
  description: string;
  minRamMb: number;
  supportsPlugins: boolean;
  supportsMods: boolean;
  install: EggInstall | JarInstall;
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
    install: {
      kind: "egg",
      eggMatch: ["vanilla"],
      env: (version) => ({ VANILLA_VERSION: version, SERVER_JARFILE: "server.jar" }),
    },
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
    install: {
      kind: "egg",
      eggMatch: ["paper"],
      env: (version) => ({
        MINECRAFT_VERSION: version,
        BUILD_NUMBER: "latest",
        SERVER_JARFILE: "server.jar",
        DL_PATH: "",
      }),
    },
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
    install: { kind: "jar" },
  },
  {
    id: "forge",
    name: "Forge",
    category: "Modded Framework",
    description: "The long-established mod loader behind most large modpacks.",
    minRamMb: 4096,
    supportsPlugins: false,
    supportsMods: true,
    install: {
      kind: "egg",
      eggMatch: ["forge"],
      env: (version) => ({
        MC_VERSION: version,
        BUILD_TYPE: "recommended",
        FORGE_VERSION: "",
        SERVER_JARFILE: "server.jar",
      }),
    },
  },
  {
    id: "fabric",
    name: "Fabric",
    category: "Modded Framework",
    description: "Lightweight, modular mod loader with a fast-moving ecosystem.",
    minRamMb: 2048,
    supportsPlugins: false,
    supportsMods: true,
    install: { kind: "jar" },
  },
];

const VERSION_CACHE_MS = 1000 * 60 * 60;
const versionCache = new Map<McSoftware, { fetchedAt: number; versions: string[] }>();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Upstream ${url} responded ${res.status}`);
  return (await res.json()) as T;
}

async function fetchVanillaReleases(): Promise<string[]> {
  const manifest = await fetchJson<{ versions: { id: string; type: string }[] }>(
    "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json",
  );
  return manifest.versions.filter((v) => v.type === "release").map((v) => v.id);
}

async function fetchVersions(software: McSoftware): Promise<string[]> {
  switch (software) {
    case "vanilla":
      return fetchVanillaReleases();
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
    case "forge": {
      // Only versions with a "recommended" promotion, since that is the
      // BUILD_TYPE the egg installs.
      const promos = await fetchJson<{ promos: Record<string, string> }>(
        "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json",
      );
      const recommended = Object.keys(promos.promos)
        .filter((key) => key.endsWith("-recommended"))
        .map((key) => key.replace(/-recommended$/, ""));
      const order = await fetchVanillaReleases();
      const rank = new Map(order.map((version, index) => [version, index]));
      return recommended
        .filter((version) => rank.has(version))
        .sort((a, b) => rank.get(a)! - rank.get(b)!);
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

/** Resolve the direct server-jar download for a jar-install software. */
export async function resolveMcDownload(
  software: McSoftware,
  version: string,
): Promise<McDownload> {
  switch (software) {
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
    default:
      throw new Error(`${software} installs by egg, not by jar download`);
  }
}

const EGG_CACHE_MS = 1000 * 60 * 30;
let eggCache: { fetchedAt: number; eggs: { nestId: number; egg: AppEgg }[] } | null = null;

/** All eggs in nests that look like the Minecraft nest, cached. */
async function listMinecraftEggs() {
  if (eggCache && Date.now() - eggCache.fetchedAt < EGG_CACHE_MS) return eggCache.eggs;

  const nests = await pteroApp.listNests();
  const eggs: { nestId: number; egg: AppEgg }[] = [];
  for (const nest of nests.data) {
    if (!/minecraft/i.test(nest.attributes.name)) continue;
    const nestEggs = await pteroApp.listEggs(nest.attributes.id);
    for (const item of nestEggs.data) {
      eggs.push({ nestId: nest.attributes.id, egg: item.attributes });
    }
  }

  eggCache = { fetchedAt: Date.now(), eggs };
  return eggs;
}

export type ResolvedMcEgg = {
  nestId: number;
  eggId: number;
  eggName: string;
  startup: string;
  dockerImage: string;
  dockerImages: Record<string, string>;
  defaults: Record<string, string>;
};

/** Find the panel egg backing an egg-install software, or null if absent. */
export async function resolveMcEgg(software: McSoftware): Promise<ResolvedMcEgg | null> {
  const entry = MC_CATALOG.find((item) => item.id === software);
  if (!entry || entry.install.kind !== "egg") return null;

  const { eggMatch } = entry.install;
  const eggs = await listMinecraftEggs();

  // Match on word boundaries, never bare substrings: "Sponge (SpongeVanilla)"
  // contains "vanilla" but is emphatically not the Vanilla egg.
  const candidates = eggs.filter(({ egg }) => {
    const name = egg.name.toLowerCase();
    return eggMatch.every((keyword) =>
      new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(name),
    );
  });
  if (candidates.length === 0) return null;

  // Prefer an exact name match, then the most specific (shortest) name.
  const target = eggMatch.join(" ");
  const match =
    candidates.find(({ egg }) => egg.name.toLowerCase() === target) ??
    [...candidates].sort((a, b) => a.egg.name.length - b.egg.name.length)[0];

  const defaults: Record<string, string> = {};
  for (const item of match.egg.relationships?.variables?.data ?? []) {
    defaults[item.attributes.env_variable] = item.attributes.default_value ?? "";
  }

  return {
    nestId: match.nestId,
    eggId: match.egg.id,
    eggName: match.egg.name,
    startup: match.egg.startup,
    dockerImage: match.egg.docker_image,
    dockerImages: match.egg.docker_images ?? {},
    defaults,
  };
}

/** Environment to send when switching a server onto `software` at `version`. */
export function mcEggEnvironment(
  software: McSoftware,
  version: string,
  defaults: Record<string, string>,
) {
  const entry = MC_CATALOG.find((item) => item.id === software);
  if (!entry || entry.install.kind !== "egg") {
    throw new Error(`${software} does not install by egg`);
  }
  return { ...defaults, ...entry.install.env(version) };
}

export function isMcSoftware(value: unknown): value is McSoftware {
  return MC_CATALOG.some((entry) => entry.id === value);
}

/** Heuristic for the egg variable that names the server jar. */
export function isJarFileVariable(variable: { name: string; env_variable: string }) {
  const text = `${variable.name} ${variable.env_variable}`.toUpperCase();
  return text.includes("JAR");
}
