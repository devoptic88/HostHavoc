/**
 * Minecraft player management — allowlist, operators, and bans.
 *
 * These live as JSON files in the server root, keyed by Mojang UUID:
 *   whitelist.json       [{ uuid, name }]
 *   ops.json             [{ uuid, name, level, bypassesPlayerLimit }]
 *   banned-players.json  [{ uuid, name, created, source, expires, reason }]
 *   banned-ips.json      [{ ip, created, source, expires, reason }]
 *
 * We own the file as the source of truth. Minecraft only rewrites these when
 * the matching console command is used, so direct edits are safe — but a
 * running server keeps them in memory, hence the reload/restart hints.
 */

export type McPlayerList = "whitelist" | "ops" | "bans" | "ipbans";

export type WhitelistEntry = { uuid: string; name: string };
export type OpEntry = {
  uuid: string;
  name: string;
  level: number;
  bypassesPlayerLimit: boolean;
};
export type BanEntry = {
  uuid: string;
  name: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
};
export type IpBanEntry = {
  ip: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
};

export const MC_PLAYER_FILES: Record<McPlayerList, string> = {
  whitelist: "/whitelist.json",
  ops: "/ops.json",
  bans: "/banned-players.json",
  ipbans: "/banned-ips.json",
};

export const OP_LEVELS = [
  { level: 4, label: "Owner", description: "All commands, including server management." },
  { level: 3, label: "Admin", description: "All commands related to multiplayer management." },
  { level: 2, label: "Gamemaster", description: "Most commands, and can use command blocks." },
  { level: 1, label: "Moderator", description: "Can bypass spawn protection." },
];

/** Parse a player JSON file, tolerating empty/blank/corrupt contents. */
export function parsePlayerFile<T>(text: string): T[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Minecraft writes these files pretty-printed with 2 spaces. */
export function serializePlayerFile(entries: unknown[]) {
  return JSON.stringify(entries, null, 2) + "\n";
}

/** Mojang returns UUIDs undashed; the JSON files use the dashed form. */
export function dashUuid(raw: string) {
  const hex = raw.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32) return raw;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type MojangProfile = { uuid: string; name: string };

/**
 * Resolve a username to its Mojang profile. Returns null when no such account
 * exists, so callers can tell "typo" apart from "Mojang is down".
 */
export async function lookupMojangProfile(username: string): Promise<MojangProfile | null> {
  const name = username.trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return null;

  const res = await fetch(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  // Mojang answers 204/404 for unknown names depending on the day.
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Mojang lookup failed (${res.status})`);

  const data = (await res.json()) as { id?: string; name?: string };
  if (!data?.id || !data?.name) return null;
  return { uuid: dashUuid(data.id), name: data.name };
}

export function isMcPlayerList(value: unknown): value is McPlayerList {
  return typeof value === "string" && value in MC_PLAYER_FILES;
}

/** Offline-mode servers derive UUIDs locally; keep entries addressable anyway. */
export function sameUuid(a: string, b: string) {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}
