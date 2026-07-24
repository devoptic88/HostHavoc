import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pteroClient, PterodactylError } from "@/lib/pterodactyl";
import { formatPterodactylError } from "@/lib/pterodactyl/errorMessages";
import { provisionOrder } from "@/lib/provision";
import { buildRustServerConfig, isRustStartupProfile } from "@/lib/rustStartup";
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

type InstallProfile = "official" | "staging" | "umod";

function normalize(input: string) {
  return input.trim().toLowerCase();
}

function variableText(variable: ClientEggVariable) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toLowerCase();
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

  if (text.includes("branch")) {
    return profile === "staging" ? "staging" : "public";
  }

  if (text.includes("framework")) {
    return profile === "umod" ? "oxide" : "none";
  }

  if (text.includes("oxide") || text.includes("umod")) {
    if (isBooleanLike(variable)) {
      return profile === "umod" ? truthyFor(variable) : falsyFor(variable);
    }
    if (text.includes("version")) {
      return profile === "umod" ? "latest" : "";
    }
    return profile === "umod" ? "oxide" : "";
  }

  if (text.includes("carbon")) {
    if (isBooleanLike(variable)) return falsyFor(variable);
    return "";
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
    const { id } = await resolveServer(params.orderId);
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

        for (const [key, rawValue] of Object.entries(updates)) {
          const variable = editableVars.get(key);
          if (!variable) continue;

          const nextValue = String(rawValue ?? "");
          if (nextValue === variable.server_value) continue;

          await pteroClient.updateVariable(id, key, nextValue);
          variable.server_value = nextValue;
        }

        const configPath = await syncRustConfig(id, vars);
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
        const profile = String(body.profile ?? "").toLowerCase() as InstallProfile;
        if (!["official", "staging", "umod"].includes(profile)) {
          throw new HttpError(400, "Unknown install profile");
        }
        await applyInstallProfile(id, profile);
        break;
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
