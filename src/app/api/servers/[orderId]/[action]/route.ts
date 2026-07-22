import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pteroClient, PterodactylError } from "@/lib/pterodactyl";
import { provisionOrder } from "@/lib/provision";

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
    return NextResponse.json({ error: err.detail }, { status: err.status || 502 });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
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
