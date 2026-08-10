import { db } from "@/lib/db";
import { pteroApp, pteroClient, PterodactylError } from "@/lib/pterodactyl";
import { formatPterodactylError } from "@/lib/pterodactyl/errorMessages";
import {
  hasRequiredRule,
  isRustMapUrlVariable,
  normalizeRustPanelVariableValue,
  normalizeRustMapUrlValue,
  patchRustStartupCommand,
} from "@/lib/rustStartup";
import {
  detectPreferredRustAllocationIp,
  findRustPortGroup,
  hasRustAppPort,
  inferRustAllocationsFromServer,
  parseRustAllocations,
  requiredRustRoles,
  rustAllocationMap,
  serializeRustAllocations,
  type RustTrackedAllocation,
} from "@/lib/rustAllocations";
import {
  dnsConfigured,
  isReservedSubdomain,
  removeServerDns,
  subdomainFromName,
  upsertServerDns,
} from "@/lib/dns";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { accountUsage } from "@/lib/accountUsage";
import {
  deleteArchive,
  hibernationArchiveKey,
  presignArchiveDownload,
  storageConfigured,
  uploadArchive,
} from "@/lib/storage";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AppAllocation, AppEggVariable, ClientEggVariable } from "@/lib/pterodactyl";

const SUBUSER_PERMISSIONS = [
  "control.console",
  "control.start",
  "control.stop",
  "control.restart",
  "file.create",
  "file.read",
  "file.read-content",
  "file.update",
  "file.delete",
  "file.archive",
  "file.sftp",
  "backup.create",
  "backup.read",
  "backup.restore",
  "backup.download",
  "backup.delete",
  "database.create",
  "database.read",
  "database.update",
  "database.delete",
  "database.view_password",
  "schedule.create",
  "schedule.read",
  "schedule.update",
  "schedule.delete",
  "startup.read",
  "startup.update",
  "settings.rename",
  "settings.reinstall",
];

const RUST_GRACE_PERIOD_DAYS = 7;

let cachedServiceUserId: number | null = null;

type ProvisionableOrder = Prisma.OrderGetPayload<{
  include: { plan: true; user: true };
}>;

type RustInstallProfile = "vanilla" | "staging" | "oxide" | "carbon";

function generatedEggValue(env: string, rules: string): string {
  const normalized = env.toUpperCase();
  const ruleSet = rules.toLowerCase();
  const required = ruleSet.split("|").includes("required");
  if (!required) return "";

  if (
    normalized.includes("PASS") ||
    normalized.includes("PASSWORD") ||
    normalized.includes("SECRET") ||
    normalized.includes("TOKEN") ||
    normalized.includes("KEY")
  ) {
    return randomBytes(18).toString("base64url");
  }

  return "";
}

function redactValue(key: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactValue(key, entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [nestedKey, redactValue(nestedKey, nestedValue)]),
    );
  }

  if (/(pass|password|secret|token|key)/i.test(key)) {
    return value ? "[REDACTED]" : value;
  }

  return value;
}

function logCreateServerPayload(orderId: string, payload: Record<string, unknown>) {
  console.info(
    `[provision] createServer payload for order ${orderId}: ${JSON.stringify(redactValue("payload", payload))}`,
  );
}

function logUpdateServerBuildPayload(orderId: string, payload: Record<string, unknown>) {
  console.info(
    `[provision] updateServerBuild payload for order ${orderId}: ${JSON.stringify(redactValue("payload", payload))}`,
  );
}

function normalizeVariableText(variable: ClientEggVariable) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toLowerCase();
}

function normalizeEggVariableText(variable: Pick<AppEggVariable, "name" | "description" | "env_variable">) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toLowerCase();
}

function rustVariableLabel(variable: Pick<AppEggVariable, "name" | "env_variable">) {
  return `${variable.name} ${variable.env_variable}`.toLowerCase();
}

function rustVariableDescription(variable: Pick<AppEggVariable, "description">) {
  return `${variable.description}`.toLowerCase();
}

function isRustBranchVariable(variable: Pick<AppEggVariable, "name" | "description" | "env_variable">) {
  return normalizeEggVariableText(variable).includes("branch");
}

function isRustFrameworkVariable(variable: Pick<AppEggVariable, "name" | "description" | "env_variable">) {
  return normalizeEggVariableText(variable).includes("framework");
}

function isRustCarbonVariable(variable: Pick<AppEggVariable, "name" | "description" | "env_variable">) {
  if (isRustBranchVariable(variable) || isRustFrameworkVariable(variable)) return false;
  const label = rustVariableLabel(variable);
  if (label.includes("carbon")) return true;
  if (label.includes("oxide") || label.includes("umod")) return false;
  return rustVariableDescription(variable).includes("carbon");
}

function isRustOxideVariable(variable: Pick<AppEggVariable, "name" | "description" | "env_variable">) {
  if (isRustBranchVariable(variable) || isRustFrameworkVariable(variable) || isRustCarbonVariable(variable)) return false;
  const label = rustVariableLabel(variable);
  if (label.includes("oxide") || label.includes("umod")) return true;
  return rustVariableDescription(variable).includes("oxide") || rustVariableDescription(variable).includes("umod");
}

function normalizeRustInstallProfile(value: string | null | undefined): RustInstallProfile {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["vanilla", "staging", "oxide", "carbon"].includes(normalized)
    ? (normalized as RustInstallProfile)
    : "vanilla";
}

function rustInstallVariableValue(
  variable: Pick<AppEggVariable, "name" | "description" | "env_variable" | "default_value" | "rules">,
  profile: RustInstallProfile,
) {
  const text = normalizeEggVariableText(variable);
  const sample = String(variable.default_value ?? "").trim().toLowerCase();
  const isBooleanLike = /boolean|bool|true|false|0|1/.test(String(variable.rules ?? "").toLowerCase());
  const truthy = sample === "true" || sample === "false" ? "true" : sample === "yes" || sample === "no" ? "yes" : "1";
  const falsy = sample === "true" || sample === "false" ? "false" : sample === "yes" || sample === "no" ? "no" : "0";

  if (isRustBranchVariable(variable)) {
    return profile === "staging" ? "staging" : "public";
  }

  if (isRustFrameworkVariable(variable)) {
    if (profile === "oxide") return "oxide";
    if (profile === "carbon") return "carbon";
    return "vanilla";
  }

  if (isRustOxideVariable(variable)) {
    if (isBooleanLike) {
      return profile === "oxide" ? truthy : falsy;
    }
    if (text.includes("version")) {
      return profile === "oxide" ? "latest" : "";
    }
    return profile === "oxide" ? "oxide" : "";
  }

  if (isRustCarbonVariable(variable)) {
    if (isBooleanLike) {
      return profile === "carbon" ? truthy : falsy;
    }
    return profile === "carbon" ? "carbon" : "";
  }

  return null;
}

function rustIdentity(name: string, orderId: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
  const suffix = orderId.slice(-6).toLowerCase();
  return `${base || "rust-server"}-${suffix}`.slice(0, 32);
}

function plusDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isTransientInstallLock(err: unknown) {
  if (!(err instanceof PterodactylError)) return false;
  const message = formatPterodactylError(err);
  return /still finishing an install or reinstall/i.test(message);
}

function desiredRustValue(
  variable: ClientEggVariable,
  order: ProvisionableOrder,
  allocations: Map<string, RustTrackedAllocation>,
) {
  const text = normalizeVariableText(variable);
  const game = allocations.get("game");
  const query = allocations.get("query");
  const rcon = allocations.get("rcon");
  const app = allocations.get("app");

  if (text.includes("identity")) {
    return rustIdentity(order.serverName, order.id);
  }

  if (
    text.includes("server name") ||
    text.includes("server title") ||
    text.includes("hostname")
  ) {
    return order.serverName;
  }

  if (text.includes("query") && text.includes("port")) {
    return query ? String(query.port) : rcon ? String(rcon.port) : game ? String(game.port) : null;
  }

  if (text.includes("rcon") && text.includes("port")) {
    return rcon ? String(rcon.port) : null;
  }

  if (text.includes("rcon") && text.includes("pass")) {
    return "12345678";
  }

  if (text.includes("app") && text.includes("port")) {
    return app ? String(app.port) : game ? String(game.port) : null;
  }

  if (
    (text.includes("server port") || text.includes("game port") || variable.env_variable.toLowerCase().includes("server_port")) &&
    !text.includes("query") &&
    !text.includes("rcon") &&
    !text.includes("app")
  ) {
    return game ? String(game.port) : null;
  }

  if (text.includes("description") && !(variable.server_value || variable.default_value)) {
    return "Hosted on HyperNode";
  }

  if (text.includes("level") && !text.includes("url") && !text.includes("custom map")) {
    const value = variable.server_value || variable.default_value;
    return value ? normalizeRustPanelVariableValue(variable, value) : null;
  }

  return null;
}

function desiredRustEnvironmentValue(
  variable: Pick<AppEggVariable, "name" | "description" | "env_variable" | "default_value">,
  order: ProvisionableOrder,
  allocations: Map<string, RustTrackedAllocation>,
) {
  const text = normalizeEggVariableText(variable);
  const game = allocations.get("game");
  const query = allocations.get("query");
  const rcon = allocations.get("rcon");
  const app = allocations.get("app");

  if (text.includes("identity")) {
    return rustIdentity(order.serverName, order.id);
  }

  if (
    text.includes("server name") ||
    text.includes("server title") ||
    text.includes("hostname")
  ) {
    return order.serverName;
  }

  if (text.includes("query") && text.includes("port")) {
    return query ? String(query.port) : rcon ? String(rcon.port) : game ? String(game.port) : null;
  }

  if (text.includes("rcon") && text.includes("port")) {
    return rcon ? String(rcon.port) : null;
  }

  if (text.includes("rcon") && text.includes("pass")) {
    return "12345678";
  }

  if (text.includes("app") && text.includes("port")) {
    return app ? String(app.port) : game ? String(game.port) : null;
  }

  if (
    (text.includes("server port") || text.includes("game port") || variable.env_variable.toLowerCase().includes("server_port")) &&
    !text.includes("query") &&
    !text.includes("rcon") &&
    !text.includes("app")
  ) {
    return game ? String(game.port) : null;
  }

  if (text.includes("description")) {
    return "Hosted on HyperNode";
  }

  if (isRustMapUrlVariable(variable)) {
    return normalizeRustMapUrlValue(variable.default_value);
  }

  if (text.includes("level") && !text.includes("url") && !text.includes("custom map")) {
    return variable.default_value
      ? normalizeRustPanelVariableValue({ ...variable, server_value: "" }, variable.default_value)
      : null;
  }

  return null;
}

async function getServiceUserId(): Promise<number> {
  if (cachedServiceUserId) return cachedServiceUserId;
  const account = await pteroClient.getAccount();
  cachedServiceUserId = account.attributes.id;
  return cachedServiceUserId;
}

async function listNodeAllocations(nodeId: number): Promise<AppAllocation[]> {
  const allocations: AppAllocation[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const res = await pteroApp.getNodeAllocations(nodeId, page);
    allocations.push(...res.data.map((item) => item.attributes));
    if (page >= (res.meta?.pagination.total_pages ?? 1)) break;
  }
  return allocations;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNodeAllocations(
  nodeId: number,
  ip: string,
  ports: number[],
  attempts = 8,
  delayMs = 350,
) {
  const wanted = new Set(ports);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const allocations = await listNodeAllocations(nodeId);
    const matched = allocations.filter((allocation) => allocation.ip === ip && wanted.has(allocation.port));
    if (
      matched.length === ports.length &&
      matched.every((allocation) => !allocation.assigned)
    ) {
      return allocations;
    }

    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }

  return listNodeAllocations(nodeId);
}

async function findServerByExternalId(externalId: string) {
  for (let page = 1; page <= 10; page += 1) {
    const res = await pteroApp.listServers(page);
    const match = res.data.find((server) => server.attributes.external_id === externalId);
    if (match) return match.attributes;
    if (page >= (res.meta?.pagination.total_pages ?? 1)) break;
  }
  return null;
}

async function findRecoverableServer(order: ProvisionableOrder) {
  const linkedOrder = await findServerByExternalId(order.id);
  if (linkedOrder) return linkedOrder;

  const serviceUserId = await getServiceUserId();
  const linkedServerIds = new Set(
    (
      await db.order.findMany({
        where: { pteroServerId: { not: null } },
        select: { pteroServerId: true },
      })
    )
      .map((row) => row.pteroServerId)
      .filter((id): id is number => id !== null),
  );

  const candidates = [];
  for (let page = 1; page <= 10; page += 1) {
    const res = await pteroApp.listServers(page, order.serverName);
    for (const server of res.data) {
      const attrs = server.attributes;
      if (attrs.name !== order.serverName) continue;
      if (attrs.user !== serviceUserId) continue;
      if (linkedServerIds.has(attrs.id)) continue;
      if (attrs.egg !== order.plan.eggId || attrs.node !== order.plan.nodeId) continue;
      if (!attrs.description.includes(order.user.email)) continue;
      candidates.push(attrs);
    }
    if (page >= (res.meta?.pagination.total_pages ?? 1)) break;
  }

  return candidates.length === 1 ? candidates[0] : null;
}

async function attachProvisionedServer(
  orderId: string,
  server: { id: number; identifier: string; description?: string; external_id?: string | null },
  userEmail: string,
  allocations?: RustTrackedAllocation[] | null,
) {
  if (server.external_id !== orderId || server.description !== `HyperNode order ${orderId} - ${userEmail}`) {
    await pteroApp.updateServerDetails(server.id, {
      external_id: orderId,
      description: `HyperNode order ${orderId} - ${userEmail}`,
    });
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "ACTIVE",
      pteroServerId: server.id,
      pteroServerIdentifier: server.identifier,
      errorMessage: null,
      deleteAfterAt: null,
      rustAllocations: allocations
        ? (serializeRustAllocations(allocations) as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
}

async function reservedRustAllocationIdsForNode(nodeId: number, excludingOrderId: string) {
  const orders = await db.order.findMany({
    where: {
      id: { not: excludingOrderId },
      status: { in: ["PROVISIONING", "ACTIVE", "SUSPENDED", "GRACE_PERIOD"] },
      plan: { nodeId },
    },
    select: { rustAllocations: true },
  });

  return new Set(
    orders.flatMap((entry) => parseRustAllocations(entry.rustAllocations).map((allocation) => allocation.allocationId)),
  );
}

async function reservedRustAllocationKeysForNode(nodeId: number, excludingOrderId: string) {
  const orders = await db.order.findMany({
    where: {
      id: { not: excludingOrderId },
      status: { in: ["PROVISIONING", "ACTIVE", "SUSPENDED", "GRACE_PERIOD"] },
      plan: { nodeId },
    },
    select: { rustAllocations: true },
  });

  return new Set(
    orders.flatMap((entry) =>
      parseRustAllocations(entry.rustAllocations).map((allocation) => `${allocation.ip}:${allocation.port}`),
    ),
  );
}

async function reserveRustAllocations(
  order: ProvisionableOrder,
  includeAppPort: boolean,
): Promise<RustTrackedAllocation[]> {
  if (!order.plan.nodeId) {
    throw new Error(`Rust plan "${order.plan.name}" must be pinned to a Pterodactyl node before provisioning.`);
  }

  const config = await db.rustNodeConfig.findUnique({ where: { nodeId: order.plan.nodeId } });
  if (!config?.enabled) {
    throw new Error(
      `Rust auto-allocation is not configured for node ${order.plan.nodeId}. Open Admin -> Nodes -> ${order.plan.nodeId} and enable it first.`,
    );
  }

  const allocations = await listNodeAllocations(order.plan.nodeId);
  const reservedAllocationIds = await reservedRustAllocationIdsForNode(order.plan.nodeId, order.id);
  const reservedAllocationKeys = await reservedRustAllocationKeysForNode(order.plan.nodeId, order.id);
  const availableAllocations = allocations.map((allocation) =>
    reservedAllocationIds.has(allocation.id) || reservedAllocationKeys.has(`${allocation.ip}:${allocation.port}`)
      ? { ...allocation, assigned: true }
      : allocation,
  );
  const preferredAllocationIp = detectPreferredRustAllocationIp(allocations, config);
  if (preferredAllocationIp && preferredAllocationIp !== config.allocationIp) {
    await db.rustNodeConfig.update({
      where: { nodeId: order.plan.nodeId },
      data: { allocationIp: preferredAllocationIp },
    });
    config.allocationIp = preferredAllocationIp;
  }

  const roles = requiredRustRoles(includeAppPort);
  const selected = findRustPortGroup(availableAllocations, config, roles, reservedAllocationKeys);

  const missingPorts = selected.entries
    .filter((entry) => !entry.allocation)
    .map((entry) => String(entry.port));

  if (missingPorts.length > 0) {
    console.info(
      `[provision] createAllocations for node ${order.plan.nodeId}: ${JSON.stringify({
        orderId: order.id,
        configuredAllocationIp: config.allocationIp,
        preferredAllocationIp,
        selectedAllocationIp: selected.ip,
        allocationAlias: config.allocationAlias,
        missingPorts,
      })}`,
    );
    await pteroApp.createAllocations(order.plan.nodeId, selected.ip, missingPorts);
  }

  const freshAllocations =
    missingPorts.length > 0
      ? await waitForNodeAllocations(
          order.plan.nodeId,
          selected.ip,
          selected.entries.map((entry) => entry.port),
        )
      : availableAllocations;
  const freshByIpAndPort = new Map(
    freshAllocations.map((allocation) => [`${allocation.ip}:${allocation.port}`, allocation]),
  );

  return selected.entries.map((entry) => {
    const allocation = entry.allocation ?? freshByIpAndPort.get(`${selected.ip}:${entry.port}`);
    if (!allocation) {
      throw new Error(
        `Rust allocation ${selected.ip}:${entry.port} could not be reserved on node ${order.plan.nodeId}.`,
      );
    }
    if (reservedAllocationIds.has(allocation.id)) {
      throw new Error(
        `Rust allocation ${allocation.id} (${allocation.ip}:${allocation.port}) is already reserved by another order on node ${order.plan.nodeId}.`,
      );
    }
    if (reservedAllocationKeys.has(`${allocation.ip}:${allocation.port}`)) {
      throw new Error(
        `Rust allocation ${allocation.ip}:${allocation.port} is already reserved by another order on node ${order.plan.nodeId}.`,
      );
    }
    return {
      role: entry.role,
      allocationId: allocation.id,
      port: allocation.port,
      ip: allocation.ip,
      alias: allocation.alias,
      createdByApp: !entry.allocation,
      isDefault: entry.role === "game",
    };
  });
}

async function cleanupCreatedRustAllocations(nodeId: number, allocations: RustTrackedAllocation[]) {
  for (const allocation of allocations) {
    if (!allocation.createdByApp) continue;
    try {
      await pteroApp.deleteAllocation(nodeId, allocation.allocationId);
    } catch (err) {
      if (!(err instanceof PterodactylError && err.status === 404)) throw err;
    }
  }
}

async function releaseRustAllocations(order: {
  plan: { nodeId: number | null };
  rustAllocations: Prisma.JsonValue | null;
}) {
  if (!order.plan.nodeId) return;
  const allocations = parseRustAllocations(order.rustAllocations);
  if (allocations.length === 0) return;
  await cleanupCreatedRustAllocations(order.plan.nodeId, allocations);
}

async function resolveRustAllocationsFromServer(serverIdentifier: string, stored: Prisma.JsonValue | null) {
  const parsed = parseRustAllocations(stored);
  if (parsed.length > 0) return parsed;

  const details = await pteroClient.getClientServer(serverIdentifier);
  const allocations = details.attributes.relationships?.allocations?.data.map((item) => item.attributes) ?? [];
  return inferRustAllocationsFromServer(allocations);
}

/**
 * Minecraft refuses to boot until eula.txt says eula=true, and the file only
 * appears after a first failed start — so a fresh server silently fails the
 * customer's very first start. We write it during provisioning, but only when
 * the customer accepted the EULA at checkout.
 */
async function applyMinecraftEula(order: ProvisionableOrder, serverIdentifier: string) {
  if (!order.minecraftEulaAcceptedAt) {
    console.warn(
      `[provision] order ${order.id} has no recorded Minecraft EULA acceptance; skipping eula.txt`,
    );
    return;
  }

  const contents = [
    "# Generated by HyperNode at provisioning.",
    `# Accepted by ${order.user.email} on ${order.minecraftEulaAcceptedAt.toISOString()}.`,
    "# https://aka.ms/MinecraftEULA",
    "eula=true",
    "",
  ].join("\n");

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await pteroClient.writeFile(serverIdentifier, "/eula.txt", contents);
      return;
    } catch (err) {
      // The daemon rejects writes while the egg's install script is running.
      if (attempt === 5) throw err;
      await sleep(attempt * 2000);
    }
  }
}

/**
 * Claim a free DNS label for this order. Names collide constantly ("survival"
 * is not an original thought), so a short suffix is appended until the label is
 * free in our own table — the unique index is the real arbiter.
 */
async function reserveSubdomain(orderId: string, serverName: string) {
  const base = subdomainFromName(serverName, orderId);
  const suffix = orderId.slice(-4).toLowerCase();

  const candidates = [
    base,
    `${base}-${suffix}`,
    `${base}-${orderId.slice(-8).toLowerCase()}`,
  ];

  for (const candidate of candidates) {
    if (isReservedSubdomain(candidate)) continue;
    const taken = await db.order.findFirst({
      where: { subdomain: candidate, NOT: { id: orderId } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return null;
}

/**
 * Give the server its own address. Best-effort: a DNS failure must never fail
 * an otherwise-working provision, it just leaves the customer on IP:port.
 */
async function applyServerDns(
  order: ProvisionableOrder,
  allocation: { ip: string; port: number } | null,
) {
  if (!allocation) return;
  if (!(await dnsConfigured())) return;

  const sub = order.subdomain ?? (await reserveSubdomain(order.id, order.serverName));
  if (!sub) {
    console.warn(`[provision] no free subdomain for order ${order.id}`);
    return;
  }

  await upsertServerDns(sub, allocation, { minecraftSrv: order.plan.gameSlug === "minecraft" });
  await db.order.update({ where: { id: order.id }, data: { subdomain: sub } });
  console.info(`[provision] dns ${sub} -> ${allocation.ip}:${allocation.port} for ${order.id}`);
}

/** The public ip/port a client should be pointed at. */
async function defaultAllocationFor(serverIdentifier: string) {
  const details = await pteroClient.getClientServer(serverIdentifier);
  const allocation = details.attributes.relationships?.allocations?.data
    .map((item) => item.attributes)
    .find((item) => item.is_default);
  if (!allocation) return null;
  return { ip: allocation.ip_alias ?? allocation.ip, port: allocation.port };
}

async function applyRustProvisioningDefaults(
  order: ProvisionableOrder,
  serverIdentifier: string,
  knownAllocations?: RustTrackedAllocation[],
) {
  const startup = await pteroClient.getStartup(serverIdentifier);
  const allocations = rustAllocationMap(
    knownAllocations ?? (await resolveRustAllocationsFromServer(serverIdentifier, order.rustAllocations)),
  );

  const editableVars = startup.data
    .map((item) => item.attributes)
    .filter((variable) => variable.is_editable);

  for (const variable of editableVars) {
    const next = desiredRustValue(variable, order, allocations);
    if (next === null || next === variable.server_value || next === "") continue;
    await pteroClient.updateVariable(serverIdentifier, variable.env_variable, next);
  }
}

export async function provisionOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { plan: true, user: true },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.pteroServerId) return;
  if (order.status === "PROVISIONING") return;
  if (order.productType !== "GAME_SERVER") {
    await db.order.update({
      where: { id: order.id },
      data: { status: "MANUAL", deleteAfterAt: null },
    });
    return;
  }

  await db.order.update({
    where: { id: order.id },
    data: { status: "PROVISIONING", errorMessage: null, deleteAfterAt: null },
  });

  let reservedRustAllocations: RustTrackedAllocation[] = [];

  try {
    const { plan } = order;
    if (!plan.eggId || !plan.nestId) {
      throw new Error(
        `No Pterodactyl egg is mapped for "${plan.name}". Set the nest/egg for this plan in Admin -> Plans, then retry provisioning.`,
      );
    }
    if (plan.gameSlug === "rust" && !plan.nodeId) {
      throw new Error(`Rust plan "${plan.name}" must be pinned to a node before it can be sold.`);
    }

    const recoverable = await findRecoverableServer(order);
    if (recoverable) {
      const recoveredRustAllocations =
        plan.gameSlug === "rust"
          ? await resolveRustAllocationsFromServer(recoverable.identifier, order.rustAllocations)
          : [];
      await attachProvisionedServer(
        order.id,
        recoverable,
        order.user.email,
        recoveredRustAllocations.length > 0 ? recoveredRustAllocations : undefined,
      );
      if (plan.gameSlug === "rust") {
        try {
          await applyRustProvisioningDefaults(order, recoverable.identifier, recoveredRustAllocations);
        } catch (err) {
          if (!isTransientInstallLock(err)) throw err;
          const message = err instanceof PterodactylError ? formatPterodactylError(err) : String(err);
          console.warn(`Rust provisioning defaults delayed for recovered order ${order.id}: ${message}`);
        }
      }
      if (plan.gameSlug === "minecraft") {
        // Best-effort: the server is usable either way, the customer would
        // just hit the EULA prompt on first start.
        await applyMinecraftEula(order, recoverable.identifier).catch((err) => {
          console.warn(`Minecraft EULA write failed for recovered order ${order.id}: ${String(err)}`);
        });
      }
      await applyServerDns(order, await defaultAllocationFor(recoverable.identifier)).catch(
        (err) => console.warn(`DNS setup failed for recovered order ${order.id}: ${String(err)}`),
      );
      return;
    }

    const egg = (await pteroApp.getEgg(plan.nestId, plan.eggId)).attributes;
    const environment: Record<string, string> = {};
    const eggVariables = (egg.relationships?.variables?.data ?? []).map((item) => item.attributes);
    for (const variable of eggVariables) {
      if (plan.gameSlug === "rust" && isRustMapUrlVariable(variable)) {
        const mapUrl = normalizeRustMapUrlValue("");
        if (mapUrl || hasRequiredRule(variable.rules)) {
          environment[variable.env_variable] = mapUrl;
        }
        continue;
      }

      environment[variable.env_variable] = variable.default_value || generatedEggValue(variable.env_variable, variable.rules);
    }

    if (plan.gameSlug === "rust") {
      const rustInstallProfile = normalizeRustInstallProfile(order.rustInstallProfile);
      for (const variable of eggVariables) {
        const installProfileValue = rustInstallVariableValue(variable, rustInstallProfile);
        if (installProfileValue === null) continue;
        environment[variable.env_variable] = installProfileValue;
      }
      const includeRustAppPort = hasRustAppPort(eggVariables);
      reservedRustAllocations = await reserveRustAllocations(order, includeRustAppPort);
      await db.order.update({
        where: { id: order.id },
        data: {
          rustAllocations: serializeRustAllocations(reservedRustAllocations) as unknown as Prisma.InputJsonValue,
        },
      });
      const rustAllocationsByRole = rustAllocationMap(reservedRustAllocations);
      for (const variable of eggVariables) {
        const next = desiredRustEnvironmentValue(variable, order, rustAllocationsByRole);
        if (next === null || next === "") continue;
        environment[variable.env_variable] = next;
      }
    }

    const dockerImage = egg.docker_image ?? Object.values(egg.docker_images ?? {})[0];
    let placement:
      | { allocation: { default: number; additional?: number[] } }
      | { deploy: { locations: number[]; dedicated_ip: boolean; port_range: string[] } };
    if (reservedRustAllocations.length > 0) {
      placement = {
        allocation: {
          default: reservedRustAllocations.find((allocation) => allocation.role === "game")!.allocationId,
        },
      };
    } else if (plan.nodeId) {
      const defaultAllocation = (await listNodeAllocations(plan.nodeId)).find((allocation) => !allocation.assigned);
      if (!defaultAllocation) {
        throw new Error(
          `Node ${plan.nodeId} has no free allocations - add ports to it in Admin -> Nodes (or the panel), or unpin the node on this plan.`,
        );
      }
      placement = { allocation: { default: defaultAllocation.id } };
    } else {
      placement = {
        deploy: {
          locations: order.locationId ? [order.locationId] : [],
          dedicated_ip: false,
          port_range: [],
        },
      };
    }

    const startupCommand = plan.gameSlug === "rust" ? patchRustStartupCommand(egg.startup) : egg.startup;
    const createPayload = {
      name: order.serverName,
      user: await getServiceUserId(),
      egg: plan.eggId,
      docker_image: dockerImage,
      startup: startupCommand,
      environment,
      limits: {
        memory: plan.ramMb,
        swap: 0,
        disk: plan.diskMb,
        io: 500,
        cpu: plan.cpuPercent,
        threads: null,
      },
      feature_limits: {
        databases: plan.databases,
        allocations: Math.max(1, reservedRustAllocations.length),
        backups: plan.backups,
      },
      ...placement,
      external_id: order.id,
      description: `HyperNode order ${order.id} - ${order.user.email}`,
      start_on_completion: false,
    };

    logCreateServerPayload(order.id, createPayload);

    const created = await pteroApp.createServer(createPayload);

    const attrs = created.attributes;

    if (reservedRustAllocations.length > 1) {
      const buildPayload = {
        allocation: reservedRustAllocations.find((allocation) => allocation.role === "game")!.allocationId,
        memory: plan.ramMb,
        swap: 0,
        disk: plan.diskMb,
        io: 500,
        cpu: plan.cpuPercent,
        threads: null,
        feature_limits: {
          databases: plan.databases,
          allocations: Math.max(1, reservedRustAllocations.length),
          backups: plan.backups,
        },
        add_allocations: reservedRustAllocations
          .filter((allocation) => allocation.role !== "game")
          .map((allocation) => allocation.allocationId),
      };
      logUpdateServerBuildPayload(order.id, buildPayload);
      await pteroApp.updateServerBuild(attrs.id, buildPayload);
    }

    await attachProvisionedServer(
      order.id,
      attrs,
      order.user.email,
      reservedRustAllocations.length > 0 ? reservedRustAllocations : undefined,
    );

    if (plan.gameSlug === "rust") {
      try {
        await applyRustProvisioningDefaults(order, attrs.identifier, reservedRustAllocations);
      } catch (err) {
        if (!isTransientInstallLock(err)) throw err;
        const message = err instanceof PterodactylError ? formatPterodactylError(err) : String(err);
        console.warn(`Rust provisioning defaults delayed for order ${order.id}: ${message}`);
      }
    }

    if (plan.gameSlug === "minecraft") {
      await applyMinecraftEula(order, attrs.identifier).catch((err) => {
        console.warn(`Minecraft EULA write failed for order ${order.id}: ${String(err)}`);
      });
    }

    await applyServerDns(order, await defaultAllocationFor(attrs.identifier)).catch((err) =>
      console.warn(`DNS setup failed for order ${order.id}: ${String(err)}`),
    );

    try {
      await pteroClient.createSubuser(
        attrs.identifier,
        order.user.email,
        SUBUSER_PERMISSIONS,
      );
    } catch {
      // Dashboard access still works even if the direct panel invite fails.
    }
  } catch (err) {
    if (reservedRustAllocations.length > 0 && order.plan.nodeId) {
      await cleanupCreatedRustAllocations(order.plan.nodeId, reservedRustAllocations).catch(() => {});
    }
    const message =
      err instanceof PterodactylError
        ? formatPterodactylError(err)
        : err instanceof Error
          ? err.message
          : "Unknown provisioning error";
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "FAILED",
        errorMessage: message,
        rustAllocations: Prisma.DbNull,
        deleteAfterAt: null,
      },
    });
    throw err;
  }
}

export async function suspendOrder(orderId: string, nextStatus: "SUSPENDED" | "GRACE_PERIOD" = "SUSPENDED"): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (order.pteroServerId) {
    await pteroApp.suspendServer(order.pteroServerId);
  }
  await db.order.update({
    where: { id: orderId },
    data: { status: nextStatus, deleteAfterAt: nextStatus === "GRACE_PERIOD" ? order.deleteAfterAt : null },
  });
}

export async function unsuspendOrder(orderId: string, nextStatus: "ACTIVE" | "SUSPENDED" = "ACTIVE"): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.pteroServerId) return;
  await pteroApp.unsuspendServer(order.pteroServerId);
  await db.order.update({
    where: { id: orderId },
    data: { status: nextStatus, deleteAfterAt: null, errorMessage: null },
  });
}

const BACKUP_POLL_INTERVAL_MS = 5_000;
const BACKUP_POLL_TIMEOUT_MS = 10 * 60_000;
const INSTALL_POLL_INTERVAL_MS = 5_000;
const INSTALL_POLL_TIMEOUT_MS = 5 * 60_000;
const FILE_PULL_POLL_INTERVAL_MS = 3_000;
const FILE_PULL_POLL_TIMEOUT_MS = 3 * 60_000;
const HIBERNATION_ARCHIVE_NAME = "hypernode-hibernation-archive.tar.gz";

/** Waits for a just-created backup to finish, polling since Wings builds it async. */
async function waitForBackup(serverId: string, backupUuid: string) {
  const deadline = Date.now() + BACKUP_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const listing = await pteroClient.listBackups(serverId);
    const match = listing.data.map((item) => item.attributes).find((b) => b.uuid === backupUuid);
    if (match?.is_successful) return match;
    await sleep(BACKUP_POLL_INTERVAL_MS);
  }
  throw new Error("Timed out waiting for the backup to finish before hibernating");
}

/**
 * Park a LITE instance. When object storage is configured, this is a real
 * archive-and-delete: back up the server, stream that backup into the
 * bucket, then delete the server entirely so it holds no deploy slot and
 * costs the node nothing while parked. Waking re-provisions a fresh server
 * and restores the archive onto it.
 *
 * Without object storage configured, this falls back to suspending the
 * server in place — it keeps its slot reserved on the node but at least
 * stops billing-relevant activity, and waking is instant since nothing was
 * torn down.
 */
export async function hibernateOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { plan: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.plan.tier !== "LITE") {
    throw new Error("Only LITE servers can hibernate — PRO servers stay online 24/7");
  }
  if (order.status === "HIBERNATING" || order.hibernationPending) return;
  if (!order.pteroServerIdentifier || !order.pteroServerId) {
    throw new Error("Server is not provisioned yet");
  }

  if (!(await storageConfigured())) {
    await pteroClient.sendPower(order.pteroServerIdentifier, "stop").catch(() => {});
    await pteroApp.suspendServer(order.pteroServerId);
    await db.order.update({
      where: { id: orderId },
      data: { status: "HIBERNATING", hibernatedAt: new Date(), deleteAfterAt: null },
    });
    return;
  }

  await db.order.update({
    where: { id: orderId },
    data: { hibernationPending: true, errorMessage: null },
  });

  archiveAndHibernate(orderId).catch(async (err) => {
    const message = err instanceof Error ? err.message : "Hibernation failed";
    console.error(`Hibernation failed for order ${orderId}: ${message}`);
    await db.order
      .update({ where: { id: orderId }, data: { hibernationPending: false, errorMessage: message } })
      .catch(() => {});
  });
}

/** The actual archive-and-delete work, run detached from the request that triggered it. */
async function archiveAndHibernate(orderId: string): Promise<void> {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { plan: true },
  });
  const serverId = order.pteroServerIdentifier!;

  await pteroClient.sendPower(serverId, "stop").catch(() => {});

  const existing = await pteroClient.listBackups(serverId);
  let backup = existing.data.map((item) => item.attributes).find((b) => b.is_successful);
  if (!backup) {
    const created = await pteroClient.createBackup(serverId, `hibernate-${Date.now()}`);
    backup = await waitForBackup(serverId, created.attributes.uuid);
  }

  const download = await pteroClient.getBackupDownload(serverId, backup.uuid);
  const response = await fetch(download.attributes.url);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download backup for archiving (${response.status})`);
  }

  const key = hibernationArchiveKey(orderId, backup.uuid);
  await uploadArchive(key, response.body);

  await pteroApp.deleteServer(order.pteroServerId!);
  await releaseRustAllocations(order);
  if (order.subdomain) {
    await removeServerDns(order.subdomain).catch((err) =>
      console.warn(`DNS cleanup failed for order ${orderId}: ${String(err)}`),
    );
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "HIBERNATING",
      hibernatedAt: new Date(),
      hibernationArchiveUrl: key,
      hibernationPending: false,
      backupBytes: BigInt(backup.bytes),
      pteroServerId: null,
      pteroServerIdentifier: null,
      rustAllocations: Prisma.DbNull,
      subdomain: null,
      deleteAfterAt: null,
      errorMessage: null,
    },
  });
}

/**
 * Wings can take a few seconds to finish wiring up a brand-new container's
 * own file API even after the Application API stops reporting "installing",
 * so a Wings-proxied call (files/pull, decompress, delete) made right away
 * can fail with a transient "There was an error while communicating with
 * the machine running this server." Retry a handful of times before giving up.
 */
async function withWingsRetry<T>(fn: () => Promise<T>, attempts = 5, delayMs = 4000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof PterodactylError && err.status >= 500;
      if (!retryable || attempt === attempts) throw err;
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

/** Waits for a newly (re-)created server to leave the "installing" state. */
async function waitForInstall(pteroServerId: number) {
  const deadline = Date.now() + INSTALL_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const server = (await pteroApp.getServer(pteroServerId)).attributes;
    if (server.status !== "installing") return;
    await sleep(INSTALL_POLL_INTERVAL_MS);
  }
  throw new Error("Timed out waiting for the new server to finish installing before restore");
}

/** Waits for Wings to finish pulling the archive, since files/pull is async on the node. */
async function waitForPulledFile(serverId: string, filename: string) {
  const deadline = Date.now() + FILE_PULL_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const listing = await pteroClient.listFiles(serverId, "/").catch(() => null);
    const file = listing?.data
      .map((item) => item.attributes)
      .find((entry) => entry.name === filename);
    if (file && file.size > 0) return;
    await sleep(FILE_PULL_POLL_INTERVAL_MS);
  }
  throw new Error("Timed out waiting for the archive to download onto the new server");
}

/** Bring a hibernated LITE instance back online, if a deploy slot is free. */
export async function wakeOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { plan: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "HIBERNATING" || order.hibernationPending) return;

  const usage = await accountUsage(order.userId);
  if (usage.deployed >= usage.deploySlots) {
    throw new Error(
      "All of your deploy slots are in use. Hibernate another server or buy another slot first.",
    );
  }

  // Old-style hibernation (suspended, never archived) — the server still
  // exists on the panel, so waking is just an unsuspend.
  if (!order.hibernationArchiveUrl) {
    if (order.pteroServerId) {
      await pteroApp.unsuspendServer(order.pteroServerId);
    }
    await db.order.update({
      where: { id: orderId },
      data: { status: "ACTIVE", hibernatedAt: null, errorMessage: null },
    });
    return;
  }

  // Deliberately leave status as HIBERNATING here — provisionOrder (called
  // from restoreAndWake) has its own guard that no-ops if status is already
  // PROVISIONING, since that's normally a sign another call is mid-flight.
  // Pre-empting that status ourselves would trip the same guard on
  // ourselves. hibernationPending is the signal the UI uses instead.
  await db.order.update({
    where: { id: orderId },
    data: { hibernationPending: true, errorMessage: null },
  });

  restoreAndWake(orderId).catch(async (err) => {
    const message = err instanceof Error ? err.message : "Wake failed";
    console.error(`Wake failed for order ${orderId}: ${message}`);
    await revertFailedWake(orderId, message).catch(() => {});
  });
}

/** Re-provisions a fresh server and restores the hibernation archive onto it. */
async function restoreAndWake(orderId: string): Promise<void> {
  const before = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const archiveKey = before.hibernationArchiveUrl!;

  await provisionOrder(orderId);

  const after = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!after.pteroServerId || !after.pteroServerIdentifier) {
    throw new Error("Re-provisioning did not produce a server to restore onto");
  }

  await waitForInstall(after.pteroServerId);
  // Give Wings a moment to finish wiring up the new container's own file API
  // — the Application API can report "not installing" a few seconds before
  // Wings-proxied calls for this specific server actually succeed.
  await sleep(5000);

  const downloadUrl = await presignArchiveDownload(archiveKey);
  await withWingsRetry(() =>
    pteroClient.pullFile(after.pteroServerIdentifier!, downloadUrl, "/", HIBERNATION_ARCHIVE_NAME),
  );
  await waitForPulledFile(after.pteroServerIdentifier, HIBERNATION_ARCHIVE_NAME);
  await withWingsRetry(() =>
    pteroClient.decompressFile(after.pteroServerIdentifier!, "/", HIBERNATION_ARCHIVE_NAME),
  );
  await withWingsRetry(() =>
    pteroClient.deleteFiles(after.pteroServerIdentifier!, "/", [HIBERNATION_ARCHIVE_NAME]),
  );

  await deleteArchive(archiveKey).catch((err) =>
    console.warn(`Archive cleanup failed for order ${orderId}: ${String(err)}`),
  );

  await db.order.update({
    where: { id: orderId },
    data: {
      hibernationArchiveUrl: null,
      hibernatedAt: null,
      hibernationPending: false,
      errorMessage: null,
    },
  });
}

async function revertFailedWake(orderId: string, message: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { plan: true },
  });
  if (!order) return;

  if (order.pteroServerId) {
    try {
      await pteroApp.deleteServer(order.pteroServerId);
    } catch (err) {
      if (!(err instanceof PterodactylError && err.status === 404)) throw err;
    }
  }

  await releaseRustAllocations(order).catch(() => {});
  if (order.subdomain) {
    await removeServerDns(order.subdomain).catch(() => {});
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "HIBERNATING",
      hibernationPending: false,
      errorMessage: message,
      pteroServerId: null,
      pteroServerIdentifier: null,
      rustAllocations: Prisma.DbNull,
      subdomain: null,
      deleteAfterAt: null,
    },
  });
}

export async function scheduleOrderTermination(orderId: string, now = new Date()): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (order.status === "CANCELLED") return;

  if (order.pteroServerId) {
    try {
      await pteroApp.suspendServer(order.pteroServerId);
    } catch (err) {
      if (!(err instanceof PterodactylError && err.status === 404)) throw err;
    }
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "GRACE_PERIOD",
      deleteAfterAt: plusDays(now, RUST_GRACE_PERIOD_DAYS),
      errorMessage: null,
    },
  });
}

/**
 * Stop billing before anything else in terminateOrder, so a later infra
 * failure (Pterodactyl unreachable, etc.) can never leave a customer's card
 * being charged for a server that's already gone or about to be deleted.
 * Best-effort: an already-cancelled subscription must not block termination.
 */
async function cancelStripeSubscription(subscriptionId: string) {
  if (!(await stripeConfigured())) return;
  try {
    await (await stripe()).subscriptions.cancel(subscriptionId);
  } catch (err) {
    console.warn(`Stripe subscription cancel failed for ${subscriptionId}: ${String(err)}`);
  }
}

export async function terminateOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { plan: true },
  });
  if (!order) return;

  if (order.stripeSubscriptionId) {
    await cancelStripeSubscription(order.stripeSubscriptionId);
  }

  if (order.pteroServerId) {
    try {
      await pteroApp.deleteServer(order.pteroServerId);
    } catch (err) {
      if (!(err instanceof PterodactylError && err.status === 404)) throw err;
    }
  }

  await releaseRustAllocations(order);

  // Free the address so the label can be reused, and so we don't leave records
  // pointing at a node that no longer runs this server.
  if (order.subdomain) {
    await removeServerDns(order.subdomain).catch((err) =>
      console.warn(`DNS cleanup failed for order ${orderId}: ${String(err)}`),
    );
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      pteroServerId: null,
      pteroServerIdentifier: null,
      rustAllocations: Prisma.DbNull,
      subdomain: null,
      deleteAfterAt: null,
      errorMessage: null,
    },
  });
}

/**
 * One-time repair for the bug where terminateOrder() never cancelled the
 * Stripe subscription: finds every order we've already cancelled on our side
 * that still names a subscription, checks its live status in Stripe, and
 * cancels any that Stripe still shows as active. Dry run by default so the
 * exact list can be reviewed before anything is actually cancelled.
 */
export async function cleanupStaleSubscriptions(dryRun: boolean) {
  if (!(await stripeConfigured())) {
    throw new Error("Stripe is not configured");
  }
  const s = await stripe();

  const candidates = await db.order.findMany({
    where: { status: "CANCELLED", stripeSubscriptionId: { not: null } },
    select: { id: true, serverName: true, stripeSubscriptionId: true, updatedAt: true },
  });

  const results: {
    orderId: string;
    serverName: string;
    subscriptionId: string;
    stripeStatus: string;
    action: "already_canceled" | "canceled" | "would_cancel" | "not_found" | "error";
    detail?: string;
  }[] = [];

  for (const order of candidates) {
    const subscriptionId = order.stripeSubscriptionId!;
    try {
      const sub = await s.subscriptions.retrieve(subscriptionId);
      if (sub.status === "canceled") {
        results.push({
          orderId: order.id,
          serverName: order.serverName,
          subscriptionId,
          stripeStatus: sub.status,
          action: "already_canceled",
        });
        continue;
      }

      if (dryRun) {
        results.push({
          orderId: order.id,
          serverName: order.serverName,
          subscriptionId,
          stripeStatus: sub.status,
          action: "would_cancel",
        });
      } else {
        await s.subscriptions.cancel(subscriptionId);
        results.push({
          orderId: order.id,
          serverName: order.serverName,
          subscriptionId,
          stripeStatus: sub.status,
          action: "canceled",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        orderId: order.id,
        serverName: order.serverName,
        subscriptionId,
        stripeStatus: "unknown",
        action: message.toLowerCase().includes("no such subscription") ? "not_found" : "error",
        detail: message,
      });
    }
  }

  return {
    dryRun,
    scanned: candidates.length,
    alreadyCanceled: results.filter((r) => r.action === "already_canceled").length,
    wouldCancel: results.filter((r) => r.action === "would_cancel").length,
    canceled: results.filter((r) => r.action === "canceled").length,
    notFound: results.filter((r) => r.action === "not_found").length,
    errors: results.filter((r) => r.action === "error").length,
    results,
  };
}

export async function cleanupExpiredOrders(now = new Date()) {
  const expired = await db.order.findMany({
    where: {
      status: "GRACE_PERIOD",
      deleteAfterAt: { lte: now },
    },
    include: { plan: true },
  });

  const results = [];
  for (const order of expired) {
    try {
      await terminateOrder(order.id);
      results.push({ orderId: order.id, ok: true });
    } catch (err) {
      results.push({
        orderId: order.id,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown cleanup error",
      });
    }
  }
  return results;
}
