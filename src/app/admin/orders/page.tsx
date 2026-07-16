import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatMoney } from "@/lib/utils";
import {
  adminSuspend,
  adminTerminate,
  adminUnsuspend,
  markOrderActive,
  retryProvision,
} from "../actions";

export const dynamic = "force-dynamic";

const tone: Record<string, "green" | "yellow" | "red" | "steel" | "violet"> = {
  ACTIVE: "green",
  PENDING: "yellow",
  PROVISIONING: "yellow",
  MANUAL: "violet",
  SUSPENDED: "red",
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
      <div className="space-y-4">
        {orders.length === 0 && (
          <Card>
            <CardBody className="py-14 text-center text-sm text-steel-faint">
              No orders yet.
            </CardBody>
          </Card>
        )}
        {orders.map((o) => (
          <Card key={o.id}>
            <CardBody className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{o.serverName}</p>
                  <Badge tone={tone[o.status] ?? "steel"}>{o.status}</Badge>
                  {o.pteroServerId && (
                    <span className="font-mono text-xs text-steel-faint">
                      ptero #{o.pteroServerId}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-steel-faint">
                  {o.user.email} · {o.plan.name} ·{" "}
                  {formatMoney(Number(o.plan.priceMonthly))}/mo ·{" "}
                  {formatDate(o.createdAt)}
                </p>
                {o.errorMessage && (
                  <p className="mt-1 text-xs text-danger">{o.errorMessage}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(o.status === "FAILED" || o.status === "PENDING") &&
                  o.productType === "GAME_SERVER" && (
                    <form action={retryProvision}>
                      <input type="hidden" name="orderId" value={o.id} />
                      <Button size="sm" variant="outline">Provision</Button>
                    </form>
                  )}
                {o.status === "MANUAL" && (
                  <form action={markOrderActive}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <Button size="sm" variant="outline">Mark fulfilled</Button>
                  </form>
                )}
                {o.status === "ACTIVE" && o.pteroServerId && (
                  <form action={adminSuspend}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <Button size="sm" variant="secondary">Suspend</Button>
                  </form>
                )}
                {o.status === "SUSPENDED" && (
                  <form action={adminUnsuspend}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <Button size="sm" variant="secondary">Unsuspend</Button>
                  </form>
                )}
                {o.status !== "CANCELLED" && (
                  <form action={adminTerminate}>
                    <input type="hidden" name="orderId" value={o.id} />
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
