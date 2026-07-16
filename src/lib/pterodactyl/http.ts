import { getSetting } from "@/lib/settings";
import { PterodactylError } from "./types";

type ApiKind = "application" | "client";

async function config(): Promise<string> {
  const url = (await getSetting("PTERODACTYL_URL")).replace(/\/$/, "");
  if (!url)
    throw new PterodactylError(0, "Pterodactyl panel URL is not configured (Admin → Settings)");
  return url;
}

async function keyFor(kind: ApiKind): Promise<string> {
  const key = await getSetting(
    kind === "application" ? "PTERODACTYL_APP_API_KEY" : "PTERODACTYL_CLIENT_API_KEY",
  );
  if (!key)
    throw new PterodactylError(
      0,
      `Pterodactyl ${kind} API key is not configured (Admin → Settings)`,
    );
  return key;
}

export async function pteroConfigured(): Promise<boolean> {
  const [url, appKey] = await Promise.all([
    getSetting("PTERODACTYL_URL"),
    getSetting("PTERODACTYL_APP_API_KEY"),
  ]);
  return Boolean(url && appKey);
}

export async function pteroFetch<T>(
  kind: ApiKind,
  path: string,
  init: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string | number | undefined>;
    raw?: boolean;
  } = {},
): Promise<T> {
  const base = await config();
  const prefix = kind === "application" ? "/api/application" : "/api/client";
  const url = new URL(`${base}${prefix}${path}`);
  if (init.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await keyFor(kind)}`,
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    let errors: unknown;
    try {
      const data = await res.json();
      errors = data?.errors;
      detail = data?.errors?.[0]?.detail || data?.errors?.[0]?.code || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new PterodactylError(res.status, detail, errors);
  }

  if (res.status === 204) return undefined as T;
  if (init.raw) return (await res.text()) as T;
  return (await res.json()) as T;
}
