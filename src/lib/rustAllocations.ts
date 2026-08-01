import type { AppAllocation, AppEggVariable, ClientAllocation, ClientEggVariable } from "@/lib/pterodactyl";

export type RustAllocationRole = "game" | "query" | "rcon" | "app";

export interface RustTrackedAllocation {
  role: RustAllocationRole;
  allocationId: number;
  port: number;
  ip: string;
  alias: string | null;
  createdByApp: boolean;
  isDefault: boolean;
}

export interface RustNodeConfigInput {
  nodeId: number;
  enabled: boolean;
  allocationIp: string;
  allocationAlias: string | null;
  portRanges: string;
  portStride: number;
}

const ROLE_OFFSETS: Record<RustAllocationRole, number> = {
  game: 0,
  query: 2,
  rcon: 4,
  app: 6,
};

type RustPortVariable = Pick<ClientEggVariable, "name" | "description" | "env_variable"> | Pick<AppEggVariable, "name" | "description" | "env_variable">;

export function hasRustAppPort(vars: RustPortVariable[]) {
  return vars.some((variable) => {
    const text = `${variable.name} ${variable.description} ${variable.env_variable}`.toLowerCase();
    return text.includes("app") && text.includes("port");
  });
}

export function requiredRustRoles(includeAppPort: boolean): RustAllocationRole[] {
  return includeAppPort ? ["game", "query", "rcon", "app"] : ["game", "query", "rcon"];
}

export function portForRole(gamePort: number, role: RustAllocationRole) {
  return gamePort + ROLE_OFFSETS[role];
}

function uniquePortRoles(roles: RustAllocationRole[]) {
  const seen = new Set<number>();
  return roles.filter((role) => {
    const offset = ROLE_OFFSETS[role];
    if (seen.has(offset)) return false;
    seen.add(offset);
    return true;
  });
}

export function parsePortRanges(value: string) {
  const ports = new Set<number>();
  for (const rawPart of value.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) continue;
      for (let port = start; port <= end; port += 1) ports.add(port);
      continue;
    }
    const port = Number(part);
    if (Number.isInteger(port)) ports.add(port);
  }
  return Array.from(ports).sort((a, b) => a - b);
}

function matchesConfiguredAlias(allocation: AppAllocation, alias: string | null) {
  if (!alias) return true;
  return allocation.alias === alias;
}

export function detectPreferredRustAllocationIp(
  allocations: AppAllocation[],
  config: RustNodeConfigInput,
) {
  const allowedPorts = new Set(parsePortRanges(config.portRanges));
  const candidates = allocations.filter((allocation) => {
    if (!matchesConfiguredAlias(allocation, config.allocationAlias)) return false;
    return allowedPorts.size === 0 || allowedPorts.has(allocation.port);
  });

  const counts = new Map<string, number>();
  for (const allocation of candidates) {
    counts.set(allocation.ip, (counts.get(allocation.ip) ?? 0) + 1);
  }

  if (counts.size === 1) {
    return Array.from(counts.keys())[0] ?? null;
  }

  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1 && ranked[0][1] > ranked[1][1]) {
    return ranked[0][0];
  }

  return null;
}

export function findRustPortGroup(
  allocations: AppAllocation[],
  config: RustNodeConfigInput,
  roles: RustAllocationRole[],
  reservedKeys: Set<string> = new Set(),
) {
  const allowedPorts = new Set(parsePortRanges(config.portRanges));
  if (allowedPorts.size === 0) {
    throw new Error(`Rust auto-allocation is enabled for node ${config.nodeId}, but no valid port ranges are configured.`);
  }

  const eligibleAllocations = allocations.filter((allocation) => {
    if (!matchesConfiguredAlias(allocation, config.allocationAlias)) return false;
    return allowedPorts.has(allocation.port);
  });

  const stride = Math.max(1, config.portStride || 1);
  const distinctRoles = uniquePortRoles(roles);
  const gamePortCandidates = Array.from(allowedPorts)
    .filter((port) => distinctRoles.every((role) => allowedPorts.has(portForRole(port, role))))
    .sort((a, b) => a - b);
  const anchorPort = gamePortCandidates[0] ?? 28015;
  const candidateGamePorts = gamePortCandidates.filter((port) => (port - anchorPort) % stride === 0);

  const preferredIp = detectPreferredRustAllocationIp(allocations, config);
  const allocationsByIp = new Map<string, AppAllocation[]>();
  for (const allocation of eligibleAllocations) {
    const existing = allocationsByIp.get(allocation.ip) ?? [];
    existing.push(allocation);
    allocationsByIp.set(allocation.ip, existing);
  }

  const orderedIps = Array.from(allocationsByIp.entries())
    .sort((a, b) => {
      if (a[0] === preferredIp) return -1;
      if (b[0] === preferredIp) return 1;
      if (a[0] === config.allocationIp) return -1;
      if (b[0] === config.allocationIp) return 1;
      return b[1].length - a[1].length;
    })
    .map(([ip]) => ip);

  for (const ip of orderedIps) {
    const allocationByPort = new Map(
      (allocationsByIp.get(ip) ?? []).map((allocation) => [allocation.port, allocation]),
    );

    for (const gamePort of candidateGamePorts) {
      const group = distinctRoles.map((role) => {
        const port = portForRole(gamePort, role);
        const allocation = allocationByPort.get(port) ?? null;
        return { role, port, allocation };
      });
      if (group.some((entry) => reservedKeys.has(`${ip}:${entry.port}`))) continue;
      if (group.some((entry) => entry.allocation?.assigned)) continue;
      return { ip, entries: group };
    }
  }

  if (candidateGamePorts.length > 0) {
    const fallbackIp = preferredIp ?? config.allocationIp;
    const fallbackGamePort = candidateGamePorts.find((gamePort) =>
      distinctRoles.every((role) => !reservedKeys.has(`${fallbackIp}:${portForRole(gamePort, role)}`)),
    );
    if (fallbackGamePort !== undefined) {
      return {
        ip: fallbackIp,
        entries: distinctRoles.map((role) => {
          const port = portForRole(fallbackGamePort, role);
          return { role, port, allocation: null };
        }),
      };
    }

    return {
      ip: fallbackIp,
      entries: distinctRoles.map((role) => {
        const port = portForRole(candidateGamePorts[0], role);
        return { role, port, allocation: null };
      }),
    };
  }

  throw new Error(
    `Node ${config.nodeId} does not have a usable Rust port group in the configured ranges. Add free ports or expand the Rust ranges for this node.`,
  );
}

export function serializeRustAllocations(allocations: RustTrackedAllocation[]) {
  return allocations;
}

export function parseRustAllocations(value: unknown): RustTrackedAllocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (
      typeof item.role !== "string" ||
      typeof item.allocationId !== "number" ||
      typeof item.port !== "number" ||
      typeof item.ip !== "string" ||
      typeof item.createdByApp !== "boolean" ||
      typeof item.isDefault !== "boolean"
    ) {
      return [];
    }
    if (!["game", "query", "rcon", "app"].includes(item.role)) return [];
    return [
      {
        role: item.role as RustAllocationRole,
        allocationId: item.allocationId,
        port: item.port,
        ip: item.ip,
        alias: typeof item.alias === "string" ? item.alias : null,
        createdByApp: item.createdByApp,
        isDefault: item.isDefault,
      },
    ];
  });
}

export function inferRustAllocationsFromServer(allocations: ClientAllocation[]): RustTrackedAllocation[] {
  const game = allocations.find((allocation) => allocation.is_default);
  if (!game) return [];

  const ports = new Map(allocations.map((allocation) => [allocation.port, allocation]));
  return (["game", "query", "rcon", "app"] as RustAllocationRole[])
    .flatMap((role) => {
      const port = portForRole(game.port, role);
      const allocation = role === "game" ? game : ports.get(port);
      if (!allocation) return [];
      return [
        {
          role,
          allocationId: allocation.id,
          port: allocation.port,
          ip: allocation.ip,
          alias: allocation.ip_alias,
          createdByApp: false,
          isDefault: role === "game",
        },
      ];
    });
}

export function rustAllocationMap(allocations: RustTrackedAllocation[]) {
  return new Map(allocations.map((allocation) => [allocation.role, allocation]));
}
