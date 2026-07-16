import { db } from "@/lib/db";

/**
 * App configuration stored in the `Setting` table and editable from
 * Admin → Settings. A DB value overrides the environment variable of the
 * same name; the env var acts as a fallback (and as the only source when
 * the database is unreachable).
 */

export const SETTING_KEYS = [
  "PTERODACTYL_URL",
  "PTERODACTYL_APP_API_KEY",
  "PTERODACTYL_CLIENT_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

const CACHE_TTL_MS = 15_000;
let cache: { values: Partial<Record<SettingKey, string>>; at: number } | null = null;

async function loadDbValues(): Promise<Partial<Record<SettingKey, string>>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;
  const values: Partial<Record<SettingKey, string>> = {};
  try {
    const rows = await db.setting.findMany();
    for (const row of rows) {
      if ((SETTING_KEYS as readonly string[]).includes(row.key) && row.value !== "") {
        values[row.key as SettingKey] = row.value;
      }
    }
  } catch {
    // DB unreachable — fall back to env only, and don't poison the cache
    return {};
  }
  cache = { values, at: Date.now() };
  return values;
}

/** Resolved value for one key: DB override first, then env, then "". */
export async function getSetting(key: SettingKey): Promise<string> {
  const dbValues = await loadDbValues();
  return dbValues[key] ?? process.env[key] ?? "";
}

/** Resolved values for every known key. */
export async function getSettings(): Promise<Record<SettingKey, string>> {
  const dbValues = await loadDbValues();
  const out = {} as Record<SettingKey, string>;
  for (const key of SETTING_KEYS) {
    out[key] = dbValues[key] ?? process.env[key] ?? "";
  }
  return out;
}

/** Which keys currently have a DB override (vs env fallback / unset). */
export async function getSettingSources(): Promise<
  Record<SettingKey, "database" | "env" | "unset">
> {
  const dbValues = await loadDbValues();
  const out = {} as Record<SettingKey, "database" | "env" | "unset">;
  for (const key of SETTING_KEYS) {
    out[key] = dbValues[key] ? "database" : process.env[key] ? "env" : "unset";
  }
  return out;
}

/** Upsert DB overrides. An empty-string value deletes the override. */
export async function setSettings(entries: Partial<Record<SettingKey, string>>) {
  for (const [key, raw] of Object.entries(entries)) {
    if (!(SETTING_KEYS as readonly string[]).includes(key)) continue;
    const value = (raw ?? "").trim();
    if (value === "") {
      await db.setting.deleteMany({ where: { key } });
    } else {
      await db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }
  cache = null;
}
