// Pterodactyl Client API — acts as the HyperNode service account, which is
// added as a subuser (or is the owner) of provisioned servers. All customer
// panel actions are proxied through these calls after HyperNode verifies the
// customer owns the order tied to the server identifier.
import { pteroFetch } from "./http";
import { getSetting } from "@/lib/settings";
import type {
  Backup,
  ClientDatabase,
  ClientEggVariable,
  ClientServer,
  FileObject,
  PteroItem,
  PteroList,
  Schedule,
  ServerResources,
  WebsocketCredentials,
} from "./types";

const client = <T>(path: string, init?: Parameters<typeof pteroFetch>[2]) =>
  pteroFetch<T>("client", path, init);

// ─── Account ────────────────────────────────────────────────────────────

/** The service account that owns PTERODACTYL_CLIENT_API_KEY. */
export const getAccount = () =>
  client<PteroItem<{ id: number; username: string; email: string; admin: boolean }>>(
    "/account",
  );

// ─── Subusers ───────────────────────────────────────────────────────────

/** Grant a panel user access to a server (invites by email). */
export const createSubuser = (id: string, email: string, permissions: string[]) =>
  client<PteroItem<unknown>>(`/servers/${id}/users`, {
    method: "POST",
    body: { email, permissions },
  });

// ─── Servers ────────────────────────────────────────────────────────────

export const listClientServers = (page = 1) =>
  client<PteroList<ClientServer>>("/", {
    searchParams: { page, per_page: 50 },
  });

export const getClientServer = (id: string) =>
  client<PteroItem<ClientServer>>(`/servers/${id}`, {
    searchParams: { include: "allocations,variables" },
  });

export const getResources = (id: string) =>
  client<PteroItem<ServerResources>>(`/servers/${id}/resources`);

export const sendPower = (
  id: string,
  signal: "start" | "stop" | "restart" | "kill",
) => client<void>(`/servers/${id}/power`, { method: "POST", body: { signal } });

export const sendCommand = (id: string, command: string) =>
  client<void>(`/servers/${id}/command`, { method: "POST", body: { command } });

export const getWebsocket = (id: string) =>
  client<{ data: WebsocketCredentials }>(`/servers/${id}/websocket`);

export const renameServer = (id: string, name: string) =>
  client<void>(`/servers/${id}/settings/rename`, {
    method: "POST",
    body: { name },
  });

export const reinstall = (id: string) =>
  client<void>(`/servers/${id}/settings/reinstall`, { method: "POST" });

// ─── Startup variables ──────────────────────────────────────────────────

export const getStartup = (id: string) =>
  client<PteroList<ClientEggVariable> & { meta: { startup_command: string; raw_startup_command: string } }>(
    `/servers/${id}/startup`,
  );

export const updateVariable = (id: string, key: string, value: string) =>
  client<PteroItem<ClientEggVariable>>(`/servers/${id}/startup/variable`, {
    method: "PUT",
    body: { key, value },
  });

// ─── Files ──────────────────────────────────────────────────────────────

export const listFiles = (id: string, directory = "/") =>
  client<PteroList<FileObject>>(`/servers/${id}/files/list`, {
    searchParams: { directory },
  });

export const getFileContents = (id: string, file: string) =>
  client<string>(`/servers/${id}/files/contents`, {
    searchParams: { file },
    raw: true,
  });

export const writeFile = (id: string, file: string, content: string) =>
  pteroFetchRawBody(`/servers/${id}/files/write`, file, content);

async function pteroFetchRawBody(path: string, file: string, content: string) {
  const base = (await getSetting("PTERODACTYL_URL")).replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/client${path}?file=${encodeURIComponent(file)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getSetting("PTERODACTYL_CLIENT_API_KEY")}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: content,
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`File write failed: ${res.status}`);
}

export const renameFile = (id: string, root: string, from: string, to: string) =>
  client<void>(`/servers/${id}/files/rename`, {
    method: "PUT",
    body: { root, files: [{ from, to }] },
  });

export const deleteFiles = (id: string, root: string, files: string[]) =>
  client<void>(`/servers/${id}/files/delete`, {
    method: "POST",
    body: { root, files },
  });

export const createFolder = (id: string, root: string, name: string) =>
  client<void>(`/servers/${id}/files/create-folder`, {
    method: "POST",
    body: { root, name },
  });

export const compressFiles = (id: string, root: string, files: string[]) =>
  client<PteroItem<FileObject>>(`/servers/${id}/files/compress`, {
    method: "POST",
    body: { root, files },
  });

export const decompressFile = (id: string, root: string, file: string) =>
  client<void>(`/servers/${id}/files/decompress`, {
    method: "POST",
    body: { root, file },
  });

export const getDownloadLink = (id: string, file: string) =>
  client<PteroItem<{ url: string }>>(`/servers/${id}/files/download`, {
    searchParams: { file },
  });

export const getUploadLink = (id: string) =>
  client<PteroItem<{ url: string }>>(`/servers/${id}/files/upload`);

// ─── Backups ────────────────────────────────────────────────────────────

export const listBackups = (id: string) =>
  client<PteroList<Backup>>(`/servers/${id}/backups`);

export const createBackup = (id: string, name?: string) =>
  client<PteroItem<Backup>>(`/servers/${id}/backups`, {
    method: "POST",
    body: name ? { name } : {},
  });

export const deleteBackup = (id: string, backupUuid: string) =>
  client<void>(`/servers/${id}/backups/${backupUuid}`, { method: "DELETE" });

export const restoreBackup = (id: string, backupUuid: string) =>
  client<void>(`/servers/${id}/backups/${backupUuid}/restore`, {
    method: "POST",
    body: { truncate: false },
  });

export const getBackupDownload = (id: string, backupUuid: string) =>
  client<PteroItem<{ url: string }>>(`/servers/${id}/backups/${backupUuid}/download`);

// ─── Databases ──────────────────────────────────────────────────────────

export const listDatabases = (id: string) =>
  client<PteroList<ClientDatabase>>(`/servers/${id}/databases`, {
    searchParams: { include: "password" },
  });

export const createDatabase = (id: string, database: string, remote = "%") =>
  client<PteroItem<ClientDatabase>>(`/servers/${id}/databases`, {
    method: "POST",
    body: { database, remote },
  });

export const rotateDatabasePassword = (id: string, dbId: string) =>
  client<PteroItem<ClientDatabase>>(`/servers/${id}/databases/${dbId}/rotate-password`, {
    method: "POST",
  });

export const deleteDatabase = (id: string, dbId: string) =>
  client<void>(`/servers/${id}/databases/${dbId}`, { method: "DELETE" });

// ─── Schedules ──────────────────────────────────────────────────────────

export const listSchedules = (id: string) =>
  client<PteroList<Schedule>>(`/servers/${id}/schedules`);

export const createSchedule = (
  id: string,
  input: {
    name: string;
    minute: string;
    hour: string;
    day_of_month: string;
    month: string;
    day_of_week: string;
    is_active: boolean;
  },
) => client<PteroItem<Schedule>>(`/servers/${id}/schedules`, { method: "POST", body: input });

export const deleteSchedule = (id: string, scheduleId: number) =>
  client<void>(`/servers/${id}/schedules/${scheduleId}`, { method: "DELETE" });
