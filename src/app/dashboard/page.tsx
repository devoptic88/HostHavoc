import Link from "next/link";
import { Plus, Server } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { GAMES } from "@/content/games";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const orderStatusMap: Record<string, string> = {
  PENDING: "installing",
  PROVISIONING: "installing",
  ACTIVE: "running",
  SUSPENDED: "suspended",
  FAILED: "install_failed",
  CANCELLED: "offline",
  MANUAL: "installing",
};

export default async function DashboardPage() {
  const session = await auth();
  const orders = await db.order.findMany({
    where: { userId: session!.user.id, status: { not: "CANCELLED" } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

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
              Deploy your first game server and it will show up here with live
              stats, console, and file access.
            </p>
            <div className="mt-6">
              <ButtonLink href="/games">Browse games</ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const game = GAMES.find((g) => g.slug === order.plan.gameSlug);
            const manageable =
              order.productType === "GAME_SERVER" && order.pteroServerIdentifier;
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
                    {order.status === "FAILED" && order.errorMessage && (
                      <p className="mt-1 line-clamp-2 text-xs text-danger">
                        {order.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {order.productType !== "GAME_SERVER" ? (
                      <Badge tone="violet">
                        {order.status === "MANUAL" ? "Being set up" : order.status}
                      </Badge>
                    ) : (
                      <StatusBadge status={orderStatusMap[order.status] ?? "offline"} />
                    )}
                    {manageable && (
                      <span className="text-sm font-semibold text-hyper-300">
                        Manage →
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
