import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatMoney } from "@/lib/utils";
import { BillingPortalButton } from "@/components/dashboard/BillingPortalButton";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "green" | "yellow" | "red" | "steel" | "violet"> = {
  ACTIVE: "green",
  PENDING: "yellow",
  PROVISIONING: "yellow",
  MANUAL: "violet",
  SUSPENDED: "red",
  FAILED: "red",
  CANCELLED: "steel",
};

export default async function BillingPage() {
  const session = await auth();
  const orders = await db.order.findMany({
    where: { userId: session!.user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  const monthly = orders
    .filter((o) => o.status === "ACTIVE")
    .reduce((sum, o) => sum + Number(o.plan.priceMonthly), 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold italic text-white">
            <span className="text-gradient-hyper">Billing</span>
          </h1>
          <p className="mt-1 text-sm text-steel-dim">
            Active monthly total: <span className="font-semibold text-white">{formatMoney(monthly)}</span>
          </p>
        </div>
        <BillingPortalButton />
      </div>

      <Card>
        <CardBody className="p-0">
          {orders.length === 0 ? (
            <p className="py-14 text-center text-sm text-steel-faint">No orders yet.</p>
          ) : (
            <div className="scrollbar-slim overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-steel-faint">
                    <th className="px-5 py-3">Service</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Ordered</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-5 py-3.5 font-semibold text-white">{o.serverName}</td>
                      <td className="px-5 py-3.5 text-steel-dim">{o.plan.name}</td>
                      <td className="px-5 py-3.5 text-steel-dim">
                        {formatMoney(Number(o.plan.priceMonthly))}/mo
                      </td>
                      <td className="px-5 py-3.5 text-steel-faint">{formatDate(o.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone[o.status] ?? "steel"}>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
      <p className="mt-4 text-xs text-steel-faint">
        Manage payment methods, invoices, and cancellations through the secure
        Stripe billing portal.
      </p>
    </div>
  );
}
