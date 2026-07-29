import { db } from "@/lib/db";
import { pteroApp, pteroClient, PterodactylError } from "@/lib/pterodactyl";
import { formatPterodactylError } from "@/lib/pterodactyl/errorMessages";
import {
  findRustPortGroup,
  inferRustAllocationsFromServer,
  parseRustAllocations,
  requiredRustRoles,
  rustAllocationMap,
  serializeRustAllocations,
  type RustTrackedAllocation,
} from "@/lib/rustAllocations";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AppAllocation, ClientEggVariable } from "@/lib/pterodactyl";

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

function normalizeVariableText(variable: ClientEggVariable) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toLowerCase();
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
    return query ? String(query.port) : game ? String(game.port) : null;
  }

  if (text.includes("rcon") && text.includes("port")) {
    return rcon ? String(rcon.port) : null;
  }

  if (text.includes("rcon") && text.includes("pass")) {
    return "12345678";
  }

  if (text.includes("app") && text.includes("port")) {
    return app ? String(app.port) : "-1";
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
  const roles = requiredRustRoles(includeAppPort);
  const selected = findRustPortGroup(allocations, config, roles);

  const missingPorts = selected
    .filter((entry) => !entry.allocation)
    .map((entry) => String(entry.port));

  if (missingPorts.length > 0) {
    await pteroApp.createAllocations(order.plan.nodeId, config.allocationIp, missingPorts);
  }

  const freshAllocations = missingPorts.length > 0 ? await listNodeAllocations(order.plan.nodeId) : allocations;
  const freshByPort = new Map(freshAllocations.map((allocation) => [allocation.port, allocation]));

  return selected.map((entry) => {
    const allocation = entry.allocation ?? freshByPort.get(entry.port);
    if (!allocation) {
      throw new Error(`Rust allocation ${entry.port} could not be reserved on node ${order.plan.nodeId}.`);
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
        await applyRustProvisioningDefaults(order, recoverable.identifier, recoveredRustAllocations);
      }
      return;
    }

    const egg = (await pteroApp.getEgg(plan.nestId, plan.eggId)).attributes;
    const environment: Record<string, string> = {};
    const eggVariables = (egg.relationships?.variables?.data ?? []).map((item) => item.attributes);
    for (const variable of eggVariables) {
      environment[variable.env_variable] =
        variable.default_value ||
        generatedEggValue(variable.env_variable, variable.rules);
    }

    if (plan.gameSlug === "rust") {
      reservedRustAllocations = await reserveRustAllocations(order, false);
    }

    const dockerImage = egg.docker_image ?? Object.values(egg.docker_images ?? {})[0];
    let placement:
      | { allocation: { default: number; additional?: number[] } }
      | { deploy: { locations: number[]; dedicated_ip: boolean; port_range: string[] } };
    if (reservedRustAllocations.length > 0) {
      placement = {
        allocation: {
          default: reservedRustAllocations.find((allocation) => allocation.role === "game")!.allocationId,
          additional: reservedRustAllocations
            .filter((allocation) => allocation.role !== "game")
            .map((allocation) => allocation.allocationId),
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

    const created = await pteroApp.createServer({
      name: order.serverName,
      user: await getServiceUserId(),
      egg: plan.eggId,
      docker_image: dockerImage,
      startup: egg.startup,
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
    });

    const attrs = created.attributes;
    await attachProvisionedServer(
      order.id,
      attrs,
      order.user.email,
      reservedRustAllocations.length > 0 ? reservedRustAllocations : undefined,
    );

    if (plan.gameSlug === "rust") {
      await applyRustProvisioningDefaults(order, attrs.identifier, reservedRustAllocations);
    }

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

export async function terminateOrder(orderId: string): Promise<void> {
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

  await releaseRustAllocations(order);

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      pteroServerId: null,
      pteroServerIdentifier: null,
      rustAllocations: Prisma.DbNull,
      deleteAfterAt: null,
      errorMessage: null,
    },
  });
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
