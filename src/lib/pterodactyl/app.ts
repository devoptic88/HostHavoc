// Pterodactyl Application API — full admin control.
import { pteroFetch } from "./http";
import type {
  AppAllocation,
  AppEgg,
  AppLocation,
  AppNest,
  AppNode,
  AppServer,
  AppUser,
  CreateServerPayload,
  PteroItem,
  PteroList,
} from "./types";

const app = <T>(path: string, init?: Parameters<typeof pteroFetch>[2]) =>
  pteroFetch<T>("application", path, init);

// ─── Users ──────────────────────────────────────────────────────────────

export const listUsers = (page = 1, filter?: string) =>
  app<PteroList<AppUser>>("/users", {
    searchParams: { page, per_page: 50, "filter[email]": filter },
  });

export const getUser = (id: number) =>
  app<PteroItem<AppUser>>(`/users/${id}`);

export const findUserByEmail = async (email: string) => {
  const res = await app<PteroList<AppUser>>("/users", {
    searchParams: { "filter[email]": email },
  });
  return res.data.find(
    (u) => u.attributes.email.toLowerCase() === email.toLowerCase(),
  )?.attributes;
};

export const createUser = (input: {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password?: string;
}) => app<PteroItem<AppUser>>("/users", { method: "POST", body: input });

export const updateUser = (id: number, input: Partial<AppUser> & { password?: string }) =>
  app<PteroItem<AppUser>>(`/users/${id}`, { method: "PATCH", body: input });

export const deleteUser = (id: number) =>
  app<void>(`/users/${id}`, { method: "DELETE" });

// ─── Servers ────────────────────────────────────────────────────────────

export const listServers = (page = 1, filter?: string) =>
  app<PteroList<AppServer>>("/servers", {
    searchParams: { page, per_page: 50, "filter[name]": filter },
  });

export const getServer = (id: number) =>
  app<PteroItem<AppServer>>(`/servers/${id}`);

export const createServer = (payload: CreateServerPayload) =>
  app<PteroItem<AppServer>>("/servers", { method: "POST", body: payload });

export const updateServerDetails = (
  id: number,
  input: { name?: string; user?: number; external_id?: string; description?: string },
) => app<PteroItem<AppServer>>(`/servers/${id}/details`, { method: "PATCH", body: input });

export const updateServerBuild = (
  id: number,
  input: {
    allocation: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads?: string | null;
    feature_limits: { databases: number; allocations: number; backups: number };
  },
) => app<PteroItem<AppServer>>(`/servers/${id}/build`, { method: "PATCH", body: input });

export const suspendServer = (id: number) =>
  app<void>(`/servers/${id}/suspend`, { method: "POST" });

export const unsuspendServer = (id: number) =>
  app<void>(`/servers/${id}/unsuspend`, { method: "POST" });

export const reinstallServer = (id: number) =>
  app<void>(`/servers/${id}/reinstall`, { method: "POST" });

export const deleteServer = (id: number, force = false) =>
  app<void>(`/servers/${id}${force ? "/force" : ""}`, { method: "DELETE" });

// ─── Nodes ──────────────────────────────────────────────────────────────

export const listNodes = (page = 1) =>
  app<PteroList<AppNode>>("/nodes", { searchParams: { page, per_page: 50 } });

export const getNode = (id: number) => app<PteroItem<AppNode>>(`/nodes/${id}`);

export const getNodeAllocations = (id: number, page = 1) =>
  app<PteroList<AppAllocation>>(`/nodes/${id}/allocations`, {
    searchParams: { page, per_page: 100 },
  });

export const createAllocations = (nodeId: number, ip: string, ports: string[]) =>
  app<void>(`/nodes/${nodeId}/allocations`, {
    method: "POST",
    body: { ip, ports },
  });

export const deleteAllocation = (nodeId: number, allocationId: number) =>
  app<void>(`/nodes/${nodeId}/allocations/${allocationId}`, { method: "DELETE" });

// ─── Locations ──────────────────────────────────────────────────────────

export const listLocations = () =>
  app<PteroList<AppLocation>>("/locations", { searchParams: { per_page: 100 } });

export const createLocation = (short: string, long?: string) =>
  app<PteroItem<AppLocation>>("/locations", { method: "POST", body: { short, long } });

export const updateLocation = (id: number, short: string, long?: string) =>
  app<PteroItem<AppLocation>>(`/locations/${id}`, {
    method: "PATCH",
    body: { short, long },
  });

export const deleteLocation = (id: number) =>
  app<void>(`/locations/${id}`, { method: "DELETE" });

// ─── Nests & Eggs ───────────────────────────────────────────────────────

export const listNests = () =>
  app<PteroList<AppNest>>("/nests", { searchParams: { per_page: 100 } });

export const listEggs = (nestId: number) =>
  app<PteroList<AppEgg>>(`/nests/${nestId}/eggs`, {
    searchParams: { include: "variables" },
  });

export const getEgg = (nestId: number, eggId: number) =>
  app<PteroItem<AppEgg>>(`/nests/${nestId}/eggs/${eggId}`, {
    searchParams: { include: "variables" },
  });
