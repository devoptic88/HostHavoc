import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pteroClient, PterodactylError } from "@/lib/pterodactyl";
import { formatPterodactylError } from "@/lib/pterodactyl/errorMessages";
import { provisionOrder } from "@/lib/provision";
import {
  buildRustServerConfig,
  isRustStartupProfile,
  normalizeRustPanelVariableValue,
} from "@/lib/rustStartup";
import { queryRustServer } from "@/lib/serverQuery";
import type { ClientEggVariable } from "@/lib/pterodactyl";

/**
 * Authenticated proxy between the HyperNode dashboard and the Pterodactyl
 * client API. Every call verifies the session user owns the order (admins
 * may access any server) before forwarding with the service-account key.
 */

async function resolveOrder(orderId: string) {
  const session = await auth();
  if (!session?.user) throw new HttpError(401, "Not logged in");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || (order.userId !== session.user.id && session.user.role !== "ADMIN")) {
    throw new HttpError(404, "Server not found");
  }
  return order;
}

async function resolveServer(orderId: string) {
  const order = await resolveOrder(orderId);
  if (!order.pteroServerIdentifier) {
    throw new HttpError(409, "Server is not provisioned yet");
  }
  return { id: order.pteroServerIdentifier, order };
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function handle(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof PterodactylError) {
    return NextResponse.json({ error: formatPterodactylError(err) }, { status: err.status || 502 });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

type InstallProfile = "vanilla" | "oxide" | "carbon" | "staging";
const OXIDE_PLUGIN_DIR = "/oxide/plugins";
type UmodCatalogPlugin = {
  title: string;
  slug: string;
  description: string;
  author: string;
  downloads: number;
  downloadsShortened: string;
  updatedAt: string;
  updatedAtAtom: string;
  latestReleaseVersion: string | null;
  latestReleaseVersionFormatted: string | null;
  categoryTags: string;
  iconUrl: string;
  url: string;
  jsonUrl: string;
  downloadUrl: string;
};

let umodCatalogCache:
  | {
      expiresAt: number;
      page: number;
      items: UmodCatalogPlugin[];
    }
  | null = null;

function normalize(input: string) {
  return input.trim().toLowerCase();
}

function variableText(variable: ClientEggVariable) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toLowerCase();
}

function variableLabel(variable: Pick<ClientEggVariable, "name" | "env_variable">) {
  return `${variable.name} ${variable.env_variable}`.toLowerCase();
}

function variableDescription(variable: Pick<ClientEggVariable, "description">) {
  return `${variable.description}`.toLowerCase();
}

function isRustFrameworkVariable(variable: ClientEggVariable) {
  return variableText(variable).includes("framework");
}

function isRustBranchVariable(variable: ClientEggVariable) {
  return variableText(variable).includes("branch");
}

function isRustCarbonVariable(variable: ClientEggVariable) {
  if (isRustBranchVariable(variable) || isRustFrameworkVariable(variable)) return false;
  const label = variableLabel(variable);
  if (label.includes("carbon")) return true;
  if (label.includes("oxide") || label.includes("umod")) return false;
  return variableDescription(variable).includes("carbon");
}

function isRustOxideVariable(variable: ClientEggVariable) {
  if (isRustBranchVariable(variable) || isRustFrameworkVariable(variable) || isRustCarbonVariable(variable)) return false;
  const label = variableLabel(variable);
  if (label.includes("oxide") || label.includes("umod")) return true;
  return variableDescription(variable).includes("oxide") || variableDescription(variable).includes("umod");
}

function normalizeInstallProfile(value: string | null | undefined): InstallProfile | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["vanilla", "oxide", "carbon", "staging"].includes(normalized)
    ? (normalized as InstallProfile)
    : null;
}

function isBooleanLike(variable: ClientEggVariable) {
  return /boolean|bool|true|false|0|1/.test(variable.rules.toLowerCase());
}

function truthyFor(variable: ClientEggVariable) {
  const sample = normalize(variable.server_value || variable.default_value);
  if (sample === "true" || sample === "false") return "true";
  if (sample === "yes" || sample === "no") return "yes";
  return "1";
}

function falsyFor(variable: ClientEggVariable) {
  const sample = normalize(variable.server_value || variable.default_value);
  if (sample === "true" || sample === "false") return "false";
  if (sample === "yes" || sample === "no") return "no";
  return "0";
}

function desiredValue(variable: ClientEggVariable, profile: InstallProfile) {
  const text = variableText(variable);

  if (isRustBranchVariable(variable)) {
    return profile === "staging" ? "staging" : "public";
  }

  if (isRustFrameworkVariable(variable)) {
    if (profile === "oxide") return "oxide";
    if (profile === "carbon") return "carbon";
    return "vanilla";
  }

  if (isRustOxideVariable(variable)) {
    if (isBooleanLike(variable)) {
      return profile === "oxide" ? truthyFor(variable) : falsyFor(variable);
    }
    if (text.includes("version")) {
      return profile === "oxide" ? "latest" : "";
    }
    return profile === "oxide" ? "oxide" : "";
  }

  if (isRustCarbonVariable(variable)) {
    if (isBooleanLike(variable)) {
      return profile === "carbon" ? truthyFor(variable) : falsyFor(variable);
    }
    return profile === "carbon" ? "carbon" : "";
  }

  return null;
}

async function applyInstallProfile(serverId: string, profile: InstallProfile) {
  const startup = await pteroClient.getStartup(serverId);
  const editableVars = startup.data.map((item) => item.attributes).filter((variable) => variable.is_editable);

  for (const variable of editableVars) {
    const next = desiredValue(variable, profile);
    if (next === null || next === variable.server_value) continue;
    await pteroClient.updateVariable(serverId, variable.env_variable, next);
  }

  await pteroClient.reinstall(serverId);
}

function sanitizePluginFileName(input: string) {
  const normalized = input.trim().replace(/[?#].*$/, "");
  const base = normalized.split("/").pop() ?? "";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe.toLowerCase().endsWith(".cs")) {
    throw new HttpError(400, "Plugin URL must point to a .cs file");
  }
  if (!safe) {
    throw new HttpError(400, "Unable to determine plugin filename");
  }
  return safe;
}

async function installOxidePlugin(serverId: string, pluginUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(pluginUrl);
  } catch {
    throw new HttpError(400, "Enter a valid direct download URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new HttpError(400, "Plugin URL must use http or https");
  }

  const fileName = sanitizePluginFileName(parsed.pathname);
  const response = await fetch(parsed, {
    headers: { Accept: "text/plain, text/x-csharp, application/octet-stream;q=0.9, */*;q=0.1" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new HttpError(502, `Plugin download failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const body = await response.text();
  if (!body.trim()) {
    throw new HttpError(400, "Downloaded plugin file was empty");
  }
  if (!contentType.includes("text") && !contentType.includes("csharp") && !fileName.endsWith(".cs")) {
    throw new HttpError(400, "Downloaded file did not look like a C# plugin");
  }

  await pteroClient.createFolder(serverId, "/", "oxide").catch(() => {});
  await pteroClient.createFolder(serverId, "/oxide", "plugins").catch(() => {});
  await pteroClient.writeFile(serverId, `${OXIDE_PLUGIN_DIR}/${fileName}`, body);

  return { fileName, path: `${OXIDE_PLUGIN_DIR}/${fileName}` };
}

async function fetchUmodPluginCatalog(page = 1) {
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  if (
    umodCatalogCache &&
    umodCatalogCache.page === normalizedPage &&
    umodCatalogCache.expiresAt > Date.now()
  ) {
    return umodCatalogCache.items;
  }

  const params = new URLSearchParams({
    query: "",
    page: String(normalizedPage),
    sort: "title",
    sortdir: "asc",
    filter: "",
    author: "",
  });
  params.append("categories[]", "rust");

  const response = await fetch(`https://umod.org/plugins/search.json?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HyperNode/1.0 (+https://hypernode.gg)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new HttpError(502, `uMod catalog unavailable (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: Array<Record<string, unknown>>;
  };

  const items = Array.isArray(payload.data)
    ? payload.data.map((item) => ({
        title: String(item.title ?? ""),
        slug: String(item.slug ?? ""),
        description: String(item.description ?? ""),
        author: String(item.author ?? ""),
        downloads: Number(item.downloads ?? 0),
        downloadsShortened: String(item.downloads_shortened ?? item.downloads ?? "0"),
        updatedAt: String(item.updated_at ?? ""),
        updatedAtAtom: String(item.updated_at_atom ?? ""),
        latestReleaseVersion: item.latest_release_version ? String(item.latest_release_version) : null,
        latestReleaseVersionFormatted: item.latest_release_version_formatted
          ? String(item.latest_release_version_formatted)
          : null,
        categoryTags: String(item.tags_all ?? item.category_tags ?? ""),
        iconUrl: String(item.icon_url ?? ""),
        url: String(item.url ?? ""),
        jsonUrl: String(item.json_url ?? ""),
        downloadUrl: String(item.download_url ?? ""),
      }))
    : [];

  umodCatalogCache = {
    page: normalizedPage,
    items,
    expiresAt: Date.now() + 1000 * 60 * 15,
  };

  return items;
}

async function syncRustConfig(serverId: string, vars: ClientEggVariable[]) {
  if (!isRustStartupProfile(vars)) return null;

  const config = buildRustServerConfig(vars);
  if (!config) return null;

  await pteroClient.writeFile(serverId, config.path, config.content);
  return config.path;
}

export async function GET(
  req: Request,
  { params }: { params: { orderId: string; action: string } },
) {
  try {
    // Status works before the server exists — the provisioning screen polls it.
    if (params.action === "status") {
      const order = await resolveOrder(params.orderId);
      if (
        order.productType === "GAME_SERVER" &&
        !order.pteroServerIdentifier &&
        order.status === "PENDING" &&
        Boolean(order.stripeSubscriptionId)
      ) {
        await provisionOrder(order.id).catch(() => {});
      }
      const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
      return NextResponse.json({
        status: fresh.status,
        provisioned: Boolean(fresh.pteroServerIdentifier),
        error: fresh.errorMessage,
      });
    }
    const { id } = await resolveServer(params.orderId);
    const url = new URL(req.url);
    switch (params.action) {
      case "details":
        return NextResponse.json((await pteroClient.getClientServer(id)).attributes);
      case "resources":
        return NextResponse.json((await pteroClient.getResources(id)).attributes);
      case "query": {
        const server = await pteroClient.getClientServer(id);
        const allocation = server.attributes.relationships?.allocations?.data
          .map((item) => item.attributes)
          .find((item) => item.is_default);
        if (!allocation) throw new HttpError(404, "No server allocation found");
        const host = allocation.ip_alias ?? allocation.ip;
        return NextResponse.json(await queryRustServer(host, allocation.port));
      }
      case "ws":
        return NextResponse.json(await pteroClient.getWebsocket(id));
      case "files":
        return NextResponse.json(
          await pteroClient.listFiles(id, url.searchParams.get("dir") ?? "/"),
        );
      case "file-contents": {
        const file = url.searchParams.get("file");
        if (!file) throw new HttpError(400, "file param required");
        const contents = await pteroClient.getFileContents(id, file);
        return new NextResponse(contents, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      case "download-file": {
        const file = url.searchParams.get("file");
        if (!file) throw new HttpError(400, "file param required");
        return NextResponse.json(await pteroClient.getDownloadLink(id, file));
      }
      case "backups":
        return NextResponse.json(await pteroClient.listBackups(id));
      case "backup-download": {
        const uuid = url.searchParams.get("uuid");
        if (!uuid) throw new HttpError(400, "uuid param required");
        return NextResponse.json(await pteroClient.getBackupDownload(id, uuid));
      }
      case "databases":
        return NextResponse.json(await pteroClient.listDatabases(id));
      case "schedules":
        return NextResponse.json(await pteroClient.listSchedules(id));
      case "startup":
        return NextResponse.json(await pteroClient.getStartup(id));
      case "plugin-catalog": {
        const page = Number(url.searchParams.get("page") ?? "1");
        return NextResponse.json({
          items: await fetchUmodPluginCatalog(page),
          source: "https://umod.org/plugins?page=1&sort=title&sortdir=asc",
          page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
          cachedForSeconds: 900,
        });
      }
      default:
        throw new HttpError(404, "Unknown action");
    }
  } catch (err) {
    return handle(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { orderId: string; action: string } },
) {
  try {
    const { id, order } = await resolveServer(params.orderId);
    const body = await req.json().catch(() => ({}));
    switch (params.action) {
      case "power":
        await pteroClient.sendPower(id, body.signal);
        break;
      case "command":
        await pteroClient.sendCommand(id, String(body.command ?? ""));
        break;
      case "write-file":
        await pteroClient.writeFile(id, String(body.file), String(body.content ?? ""));
        break;
      case "delete-files":
        await pteroClient.deleteFiles(id, String(body.root ?? "/"), body.files ?? []);
        break;
      case "rename-file":
        await pteroClient.renameFile(
          id,
          String(body.root ?? "/"),
          String(body.from),
          String(body.to),
        );
        break;
      case "create-folder":
        await pteroClient.createFolder(id, String(body.root ?? "/"), String(body.name));
        break;
      case "create-backup":
        return NextResponse.json(
          await pteroClient.createBackup(id, body.name ? String(body.name) : undefined),
        );
      case "delete-backup":
        await pteroClient.deleteBackup(id, String(body.uuid));
        break;
      case "restore-backup":
        await pteroClient.restoreBackup(id, String(body.uuid));
        break;
      case "create-database":
        return NextResponse.json(
          await pteroClient.createDatabase(id, String(body.name)),
        );
      case "delete-database":
        await pteroClient.deleteDatabase(id, String(body.id));
        break;
      case "rotate-database":
        return NextResponse.json(
          await pteroClient.rotateDatabasePassword(id, String(body.id)),
        );
      case "update-variable":
        return NextResponse.json(
          await pteroClient.updateVariable(id, String(body.key), String(body.value)),
        );
      case "save-startup": {
        const updates =
          body && typeof body.updates === "object" && body.updates !== null
            ? (body.updates as Record<string, unknown>)
            : null;
        if (!updates) throw new HttpError(400, "updates payload required");

        const startup = await pteroClient.getStartup(id);
        const vars = startup.data.map((item) => item.attributes);
        const editableVars = new Map(
          vars
            .filter((variable) => variable.is_editable)
            .map((variable) => [variable.env_variable, variable]),
        );
        let pendingRustProfile: InstallProfile | null | undefined;
        const runtimeVariable = vars.find(
          (variable) => isRustFrameworkVariable(variable) || isRustBranchVariable(variable),
        );

        for (const [key, rawValue] of Object.entries(updates)) {
          const variable = editableVars.get(key);
          if (!variable) continue;

          const nextValue = normalizeRustPanelVariableValue(variable, String(rawValue ?? ""));
          if (runtimeVariable && key === runtimeVariable.env_variable) {
            pendingRustProfile = normalizeInstallProfile(nextValue);
            if (!pendingRustProfile) continue;
            continue;
          }
          if (nextValue === variable.server_value) continue;

          if (order.planId && isRustFrameworkVariable(variable)) {
            pendingRustProfile = normalizeInstallProfile(nextValue);
          }

          await pteroClient.updateVariable(id, key, nextValue);
          variable.server_value = nextValue;
        }

        if (pendingRustProfile) {
          for (const variable of vars.filter((entry) => entry.is_editable)) {
            const desired = desiredValue(variable, pendingRustProfile);
            if (desired === null || desired === variable.server_value) continue;
            await pteroClient.updateVariable(id, variable.env_variable, desired);
            variable.server_value = desired;
          }
        }

        const configPath = await syncRustConfig(id, vars);
        if (pendingRustProfile !== undefined) {
          await db.order.update({
            where: { id: params.orderId },
            data: {
              rustInstallProfile: pendingRustProfile,
              rustPendingReinstallProfile: pendingRustProfile,
            },
          });
        }
        return NextResponse.json({ ok: true, configPath });
      }
      case "rename":
        await pteroClient.renameServer(id, String(body.name));
        await db.order.update({
          where: { id: params.orderId },
          data: { serverName: String(body.name) },
        });
        break;
      case "reinstall":
        await pteroClient.reinstall(id);
        break;
      case "install-profile": {
        const profile = normalizeInstallProfile(body.profile);
        if (!profile) {
          throw new HttpError(400, "Unknown install profile");
        }
        await applyInstallProfile(id, profile);
        await db.order.update({
          where: { id: params.orderId },
          data: { rustInstallProfile: profile, rustPendingReinstallProfile: null },
        });
        break;
      }
      case "install-plugin": {
        const pluginUrl = String(body.url ?? "").trim();
        if (!pluginUrl) throw new HttpError(400, "Plugin URL is required");
        return NextResponse.json({
          ok: true,
          ...(await installOxidePlugin(id, pluginUrl)),
        });
      }
      case "create-schedule":
        return NextResponse.json(
          await pteroClient.createSchedule(id, {
            name: String(body.name),
            minute: String(body.minute ?? "0"),
            hour: String(body.hour ?? "4"),
            day_of_month: String(body.day_of_month ?? "*"),
            month: String(body.month ?? "*"),
            day_of_week: String(body.day_of_week ?? "*"),
            is_active: true,
          }),
        );
      case "delete-schedule":
        await pteroClient.deleteSchedule(id, Number(body.id));
        break;
      default:
        throw new HttpError(404, "Unknown action");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
