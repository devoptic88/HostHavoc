import { db } from "@/lib/db";
import { pteroApp, pteroClient, PterodactylError } from "@/lib/pterodactyl";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { ClientAllocation, ClientEggVariable } from "@/lib/pterodactyl";

/**
 * Provisioning model:
 *  - Game servers are created on Pterodactyl OWNED by the HyperNode service
 *    account (the account whose client API key is configured). That lets the
 *    platform proxy console/files/backups for every server with one key.
 *  - The customer's email is then invited as a subuser (best-effort) so they
 *    could also log into the raw panel if ever needed.
 */

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

let cachedServiceUserId: number | null = null;

type ProvisionableOrder = Prisma.OrderGetPayload<{
  include: { plan: true; user: true };
}>;

function generatedEggValue(env: string, rules: string): string {
  const normalized = env.toUpperCase();
  const ruleSet = rules.toLowerCase();
  const required = ruleSet.split("|").includes("required");
  if (!required) return "";

  // Many community eggs leave secret defaults blank but still mark them
  // required. Generate a safe value so provisioning can succeed.
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

function desiredRustValue(
  variable: ClientEggVariable,
  order: ProvisionableOrder,
  allocation: ClientAllocation,
) {
  const text = normalizeVariableText(variable);

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

  if (
    text.includes("query") &&
    text.includes("port")
  ) {
    // Rust discovery relies on the query port being reachable. Using the
    // server's primary allocation keeps browser listing working on single-port
    // installs instead of leaving the egg default pointed at an unrelated port.
    return String(allocation.port);
  }

  if (text.includes("description") && !(variable.server_value || variable.default_value)) {
    return `Hosted on HyperNode`;
  }

  return null;
}

async function applyRustProvisioningDefaults(order: ProvisionableOrder, serverIdentifier: string) {
  const [details, startup] = await Promise.all([
    pteroClient.getClientServer(serverIdentifier),
    pteroClient.getStartup(serverIdentifier),
  ]);
  const allocation = details.attributes.relationships?.allocations?.data
    .map((item) => item.attributes)
    .find((item) => item.is_default);
  if (!allocation) return;

  const editableVars = startup.data
    .map((item) => item.attributes)
    .filter((variable) => variable.is_editable);

  for (const variable of editableVars) {
    const next = desiredRustValue(variable, order, allocation);
    if (next === null || next === variable.server_value || next === "") continue;
    await pteroClient.updateVariable(serverIdentifier, variable.env_variable, next);
  }
}

async function getServiceUserId(): Promise<number> {
  if (cachedServiceUserId) return cachedServiceUserId;
  const account = await pteroClient.getAccount();
  cachedServiceUserId = account.attributes.id;
  return cachedServiceUserId;
}

async function findServerByExternalId(externalId: string) {
  for (let page = 1; page <= 10; page++) {
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
  for (let page = 1; page <= 10; page++) {
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
) {
  if (server.external_id !== orderId || server.description !== `HyperNode order ${orderId} — ${userEmail}`) {
    await pteroApp.updateServerDetails(server.id, {
      external_id: orderId,
      description: `HyperNode order ${orderId} — ${userEmail}`,
    });
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "ACTIVE",
      pteroServerId: server.id,
      pteroServerIdentifier: server.identifier,
      errorMessage: null,
    },
  });
}

/** First unassigned allocation on a node — used when a plan pins a node. */
async function findFreeAllocation(nodeId: number): Promise<number> {
  for (let page = 1; page <= 10; page++) {
    const res = await pteroApp.getNodeAllocations(nodeId, page);
    const free = res.data.find((a) => !a.attributes.assigned);
    if (free) return free.attributes.id;
    if (page >= (res.meta?.pagination.total_pages ?? 1)) break;
  }
  throw new Error(
    `Node ${nodeId} has no free allocations — add ports to it in Admin → Nodes (or the panel), or unpin the node on this plan.`,
  );
}

export async function provisionOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { plan: true, user: true },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.pteroServerId) return; // already provisioned
  if (order.status === "PROVISIONING") return; // avoid duplicate create attempts
  if (order.productType !== "GAME_SERVER") {
    // VPS / dedicated orders are fulfilled manually by an admin.
    await db.order.update({
      where: { id: order.id },
      data: { status: "MANUAL" },
    });
    return;
  }

  await db.order.update({
    where: { id: order.id },
    data: { status: "PROVISIONING", errorMessage: null },
  });

  try {
    const { plan } = order;
    if (!plan.eggId || !plan.nestId) {
      throw new Error(
        `No Pterodactyl egg is mapped for "${plan.name}". Set the nest/egg for this plan in Admin → Plans, then retry provisioning.`,
      );
    }

    const recoverable = await findRecoverableServer(order);
    if (recoverable) {
      await attachProvisionedServer(order.id, recoverable, order.user.email);
      if (plan.gameSlug === "rust") {
        await applyRustProvisioningDefaults(order, recoverable.identifier);
      }
      return;
    }

    const egg = (await pteroApp.getEgg(plan.nestId, plan.eggId)).attributes;
    const environment: Record<string, string> = {};
    for (const v of egg.relationships?.variables?.data ?? []) {
      environment[v.attributes.env_variable] =
        v.attributes.default_value ||
        generatedEggValue(v.attributes.env_variable, v.attributes.rules);
    }

    const dockerImage =
      egg.docker_image ?? Object.values(egg.docker_images ?? {})[0];

    // A plan pinned to a node deploys onto a specific free allocation there;
    // otherwise Pterodactyl picks a node in the customer's chosen location.
    const placement = plan.nodeId
      ? { allocation: { default: await findFreeAllocation(plan.nodeId) } }
      : {
          deploy: {
            locations: order.locationId ? [order.locationId] : [],
            dedicated_ip: false,
            port_range: [] as string[],
          },
        };

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
        allocations: 1,
        backups: plan.backups,
      },
      ...placement,
      external_id: order.id,
      description: `HyperNode order ${order.id} — ${order.user.email}`,
      start_on_completion: false,
    });

    const attrs = created.attributes;
    await attachProvisionedServer(order.id, attrs, order.user.email);

    if (plan.gameSlug === "rust") {
      await applyRustProvisioningDefaults(order, attrs.identifier);
    }

    // Best-effort: give the customer direct panel access as a subuser.
    try {
      await pteroClient.createSubuser(
        attrs.identifier,
        order.user.email,
        SUBUSER_PERMISSIONS,
      );
    } catch {
      // Not fatal — HyperNode's dashboard proxies everything anyway.
    }
  } catch (err) {
    const message =
      err instanceof PterodactylError
        ? `${err.detail}${err.errors ? ` — ${JSON.stringify(err.errors).slice(0, 500)}` : ""}`
        : err instanceof Error
          ? err.message
          : "Unknown provisioning error";
    await db.order.update({
      where: { id: orderId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw err;
  }
}

export async function suspendOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.pteroServerId) return;
  await pteroApp.suspendServer(order.pteroServerId);
  await db.order.update({ where: { id: orderId }, data: { status: "SUSPENDED" } });
}

export async function unsuspendOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.pteroServerId) return;
  await pteroApp.unsuspendServer(order.pteroServerId);
  await db.order.update({ where: { id: orderId }, data: { status: "ACTIVE" } });
}

export async function terminateOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (order.pteroServerId) {
    try {
      await pteroApp.deleteServer(order.pteroServerId);
    } catch (err) {
      if (!(err instanceof PterodactylError && err.status === 404)) throw err;
    }
  }
  await db.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
}
