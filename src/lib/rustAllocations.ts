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

export function findRustPortGroup(
  allocations: AppAllocation[],
  config: RustNodeConfigInput,
  roles: RustAllocationRole[],
) {
  const allowedPorts = new Set(parsePortRanges(config.portRanges));
  if (allowedPorts.size === 0) {
    throw new Error(`Rust auto-allocation is enabled for node ${config.nodeId}, but no valid port ranges are configured.`);
  }

  const eligibleAllocations = allocations.filter((allocation) => {
    if (allocation.ip !== config.allocationIp) return false;
    if (config.allocationAlias && allocation.alias && allocation.alias !== config.allocationAlias) return false;
    return allowedPorts.has(allocation.port);
  });
  const allocationByPort = new Map(eligibleAllocations.map((allocation) => [allocation.port, allocation]));

  const stride = Math.max(1, config.portStride || 1);
  const gamePortCandidates = Array.from(allowedPorts)
    .filter((port) => roles.every((role) => allowedPorts.has(portForRole(port, role))))
    .sort((a, b) => a - b);
  const anchorPort = gamePortCandidates[0] ?? 28015;
  const candidateGamePorts = gamePortCandidates.filter((port) => (port - anchorPort) % stride === 0);

  for (const gamePort of candidateGamePorts) {
    const group = roles.map((role) => {
      const port = portForRole(gamePort, role);
      const allocation = allocationByPort.get(port) ?? null;
      return { role, port, allocation };
    });
    if (group.some((entry) => entry.allocation?.assigned)) continue;
    return group;
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
