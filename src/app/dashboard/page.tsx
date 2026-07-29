import Link from "next/link";
import { Plus, Server } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { GAMES } from "@/content/games";
import { pteroClient } from "@/lib/pterodactyl";
import { normalizePterodactylMessage } from "@/lib/pterodactyl/errorMessages";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const orderStatusMap: Record<string, string> = {
  PENDING: "installing",
  PROVISIONING: "installing",
  ACTIVE: "running",
  SUSPENDED: "suspended",
  GRACE_PERIOD: "suspended",
  FAILED: "install_failed",
  CANCELLED: "offline",
  MANUAL: "installing",
};

type LiveDashboardStatus = "installing" | "starting" | "running" | "stopping" | "offline" | "suspended" | "install_failed";

function liveStatusMessage(status: LiveDashboardStatus) {
  switch (status) {
    case "installing":
      return "Server installing";
    case "starting":
      return "Server starting";
    case "running":
      return "Server running";
    case "stopping":
      return "Server stopping";
    default:
      return null;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const orders = await db.order.findMany({
    where: { userId: session!.user.id, status: { not: "CANCELLED" } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  const liveStatuses = new Map<string, LiveDashboardStatus>();

  await Promise.all(
    orders
      .filter((order) => order.productType === "GAME_SERVER" && order.pteroServerIdentifier)
      .map(async (order) => {
        try {
          const server = await pteroClient.getClientServer(order.pteroServerIdentifier!);
          if (server.attributes.is_suspended) {
            liveStatuses.set(order.id, "suspended");
            return;
          }
          if (server.attributes.is_installing) {
            liveStatuses.set(order.id, "installing");
            return;
          }
          const resources = await pteroClient.getResources(order.pteroServerIdentifier!);
          liveStatuses.set(order.id, resources.attributes.current_state);
        } catch {
          if (order.status === "FAILED") liveStatuses.set(order.id, "install_failed");
        }
      }),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold italic text-white">
            My <span className="text-gradient-hyper">servers</span>
          </h1>
          <p className="mt-1 text-sm text-steel-dim">
            Welcome back, {session!.user.name.split(" ")[0]}.
          </p>
        </div>
        <ButtonLink href="/games" size="sm">
          <Plus className="h-4 w-4" /> New server
        </ButtonLink>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <Server className="mx-auto h-10 w-10 text-steel-faint" />
            <p className="mt-4 font-display text-lg font-bold text-white">
              No servers yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-steel-dim">
              Deploy your first game server and it will show up here with live stats, console, and file access.
            </p>
            <div className="mt-6">
              <ButtonLink href="/games">Browse games</ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const game = GAMES.find((entry) => entry.slug === order.plan.gameSlug);
            const manageable = order.productType === "GAME_SERVER" && order.pteroServerIdentifier;
            const liveStatus = liveStatuses.get(order.id);
            const displayStatus = liveStatus ?? (orderStatusMap[order.status] as LiveDashboardStatus | undefined) ?? "offline";
            const liveMessage = liveStatusMessage(displayStatus);
            const inner = (
              <Card glow={Boolean(manageable)}>
                <CardBody className="flex flex-wrap items-center gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl font-display text-lg font-extrabold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${game?.accent ?? "#2F6BFF"}44, #151D2E)`,
                    }}
                  >
                    {(game?.name ?? order.plan.name).slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold text-white">
                      {order.serverName}
                    </p>
                    <p className="text-xs text-steel-faint">
                      {order.plan.name} · {formatMoney(Number(order.plan.priceMonthly))}/mo
                    </p>
                    {order.status === "GRACE_PERIOD" && order.deleteAfterAt && (
                      <p className="mt-1 text-xs text-warning">
                        Suspended during grace period. Final deletion is scheduled for {formatDate(order.deleteAfterAt)}.
                      </p>
                    )}
                    {liveMessage ? (
                      <p className="mt-1 line-clamp-2 text-xs text-steel">
                        {liveMessage}
                      </p>
                    ) : null}
                    {!liveMessage && order.status === "FAILED" && order.errorMessage && (
                      <p className="mt-1 line-clamp-2 text-xs text-danger">
                        {normalizePterodactylMessage(order.errorMessage)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {order.productType !== "GAME_SERVER" ? (
                      <Badge tone="violet">
                        {order.status === "MANUAL" ? "Being set up" : order.status}
                      </Badge>
                    ) : (
                      <StatusBadge status={displayStatus} />
                    )}
                    {manageable && (
                      <span className="text-sm font-semibold text-hyper-300">
                        {"Manage ->"}
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
            return manageable ? (
              <Link key={order.id} href={`/dashboard/servers/${order.id}`} className="block">
                {inner}
              </Link>
            ) : (
              <div key={order.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
