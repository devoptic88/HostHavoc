/**
 * Per-server DNS, so customers hand out `their-server.hypernode.gg` instead of
 * an IP and port.
 *
 * Each game server gets two records in Cloudflare:
 *   A    <sub>.<domain>                 -> node IP
 *   SRV  _minecraft._tcp.<sub>.<domain> -> port on that host
 *
 * The SRV record is what lets the Minecraft client find a non-default port
 * without the player typing one. Everything here is a no-op when Cloudflare
 * credentials are unset, so the app runs fine without DNS configured.
 */

import { getSetting } from "@/lib/settings";

const API = "https://api.cloudflare.com/client/v4";

export type DnsRecordRef = { id: string; type: string; name: string };

export async function dnsConfigured() {
  const [token, zone] = await Promise.all([
    getSetting("CLOUDFLARE_API_TOKEN"),
    getSetting("CLOUDFLARE_ZONE_ID"),
  ]);
  return Boolean(token && zone);
}

export async function serverDomain() {
  return (await getSetting("SERVER_DOMAIN")).trim().replace(/^\.+|\.+$/g, "");
}

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const [token, zone] = await Promise.all([
    getSetting("CLOUDFLARE_API_TOKEN"),
    getSetting("CLOUDFLARE_ZONE_ID"),
  ]);
  if (!token || !zone) throw new Error("Cloudflare is not configured");

  const res = await fetch(`${API}/zones/${zone}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; result?: T; errors?: { code: number; message: string }[] }
    | null;

  if (!res.ok || !body?.success) {
    const detail = body?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ");
    throw new Error(`Cloudflare ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return body.result as T;
}

/**
 * Turn a server name into a DNS label. Falls back to the order id when the
 * name has nothing usable in it (emoji-only names are not hypothetical).
 */
export function subdomainFromName(name: string, orderId: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    // Drop the combining marks NFKD just split off, so "crème" becomes
    // "creme" rather than "cre-me".
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || `server-${orderId.slice(-8).toLowerCase()}`;
}

export function isValidSubdomain(sub: string) {
  // Single DNS label: alphanumeric and hyphens, not leading/trailing hyphen.
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(sub);
}

/** Labels we must never let a customer take. */
const RESERVED = new Set([
  "www", "panel", "app", "api", "admin", "mail", "smtp", "imap", "ns1", "ns2",
  "billing", "status", "support", "cdn", "assets", "staging", "dev", "test",
  "node1", "node", "wings", "db", "root", "@",
]);

export function isReservedSubdomain(sub: string) {
  return RESERVED.has(sub);
}

export async function findRecords(name: string): Promise<DnsRecordRef[]> {
  const exact = await cf<DnsRecordRef[]>(
    `/dns_records?name=${encodeURIComponent(name)}&per_page=100`,
  );
  const srv = await cf<DnsRecordRef[]>(
    `/dns_records?name=${encodeURIComponent(`_minecraft._tcp.${name}`)}&per_page=100`,
  );
  return [...exact, ...srv];
}

/** True when the label is free to claim (no existing records of any type). */
export async function subdomainAvailable(sub: string) {
  const domain = await serverDomain();
  if (!domain) throw new Error("SERVER_DOMAIN is not configured");
  const records = await findRecords(`${sub}.${domain}`);
  return records.length === 0;
}

export type DnsTarget = { ip: string; port: number };

/**
 * Point `<sub>.<domain>` at a server. Existing records for the label are
 * replaced, so this is safe to call again after a port or node change.
 */
export async function upsertServerDns(sub: string, target: DnsTarget) {
  const domain = await serverDomain();
  if (!domain) throw new Error("SERVER_DOMAIN is not configured");

  const fqdn = `${sub}.${domain}`;
  const srvName = `_minecraft._tcp.${fqdn}`;

  // Clear whatever is there so repeated calls converge rather than duplicate.
  await removeServerDns(sub);

  await cf(`/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "A",
      name: fqdn,
      content: target.ip,
      ttl: 120,
      // Game traffic is not HTTP; proxying it through Cloudflare would break it.
      proxied: false,
      comment: "HyperNode game server",
    }),
  });

  await cf(`/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "SRV",
      name: srvName,
      ttl: 120,
      data: {
        service: "_minecraft",
        proto: "_tcp",
        name: fqdn,
        priority: 0,
        weight: 5,
        port: target.port,
        target: fqdn,
      },
      comment: "HyperNode game server",
    }),
  });

  return { fqdn, srvName };
}

/** Remove both records for a label. Safe when nothing exists. */
export async function removeServerDns(sub: string) {
  const domain = await serverDomain();
  if (!domain) return;
  const records = await findRecords(`${sub}.${domain}`);
  for (const record of records) {
    await cf(`/dns_records/${record.id}`, { method: "DELETE" }).catch(() => {});
  }
  return records.length;
}
