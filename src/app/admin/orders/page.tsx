import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatMoney } from "@/lib/utils";
import {
  adminScheduleTermination,
  adminSuspend,
  adminTerminate,
  adminUnsuspend,
  markOrderActive,
  retryProvision,
  runExpiredOrderCleanup,
} from "../actions";

export const dynamic = "force-dynamic";

const tone: Record<string, "green" | "yellow" | "red" | "steel" | "violet"> = {
  ACTIVE: "green",
  PENDING: "yellow",
  PROVISIONING: "yellow",
  MANUAL: "violet",
  SUSPENDED: "red",
  GRACE_PERIOD: "yellow",
  FAILED: "red",
  CANCELLED: "steel",
};

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, plan: true },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        <span className="text-gradient-hyper">Orders</span> & services
      </h1>
      <div className="mb-6 flex justify-end">
        <form action={runExpiredOrderCleanup}>
          <Button size="sm" variant="outline">Run expired cleanup</Button>
        </form>
      </div>
      <div className="space-y-4">
        {orders.length === 0 && (
          <Card>
            <CardBody className="py-14 text-center text-sm text-steel-faint">
              No orders yet.
            </CardBody>
          </Card>
        )}
        {orders.map((order) => (
          <Card key={order.id}>
            <CardBody className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{order.serverName}</p>
                  <Badge tone={tone[order.status] ?? "steel"}>{order.status}</Badge>
                  {order.pteroServerId && (
                    <span className="font-mono text-xs text-steel-faint">
                      ptero #{order.pteroServerId}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-steel-faint">
                  {order.user.email} · {order.plan.name} · {formatMoney(Number(order.plan.priceMonthly))}/mo · {formatDate(order.createdAt)}
                </p>
                {order.status === "GRACE_PERIOD" && order.deleteAfterAt && (
                  <p className="mt-1 text-xs text-warning">
                    Scheduled for final deletion on {formatDate(order.deleteAfterAt)}.
                  </p>
                )}
                {order.errorMessage && (
                  <p className="mt-1 text-xs text-danger">{order.errorMessage}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(order.status === "FAILED" || order.status === "PENDING") &&
                  order.productType === "GAME_SERVER" && (
                    <form action={retryProvision}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button size="sm" variant="outline">Provision</Button>
                    </form>
                  )}
                {order.status === "MANUAL" && (
                  <form action={markOrderActive}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button size="sm" variant="outline">Mark fulfilled</Button>
                  </form>
                )}
                {order.status === "ACTIVE" && order.pteroServerId && (
                  <>
                    <form action={adminSuspend}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button size="sm" variant="secondary">Suspend</Button>
                    </form>
                    <form action={adminScheduleTermination}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button size="sm" variant="outline">Start grace period</Button>
                    </form>
                  </>
                )}
                {order.status === "SUSPENDED" && (
                  <form action={adminUnsuspend}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button size="sm" variant="secondary">Unsuspend</Button>
                  </form>
                )}
                {order.status === "GRACE_PERIOD" && (
                  <form action={adminUnsuspend}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button size="sm" variant="secondary">Recover service</Button>
                  </form>
                )}
                {order.status !== "CANCELLED" && (
                  <form action={adminTerminate}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button size="sm" variant="danger">Terminate</Button>
                  </form>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
