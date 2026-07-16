import Link from "next/link";
import { Boxes, LifeBuoy, Server, ShoppingCart, Users } from "lucide-react";
import { db } from "@/lib/db";
import { pteroApp, pteroConfigured } from "@/lib/pterodactyl";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [users, activeOrders, openTickets, recentOrders, revenueOrders] =
    await Promise.all([
      db.user.count(),
      db.order.count({ where: { status: "ACTIVE" } }),
      db.ticket.count({ where: { status: { in: ["OPEN", "CUSTOMER_REPLY"] } } }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: true, plan: true },
      }),
      db.order.findMany({ where: { status: "ACTIVE" }, include: { plan: true } }),
    ]);

  const mrr = revenueOrders.reduce((s, o) => s + Number(o.plan.priceMonthly), 0);

  let nodeCount: number | null = null;
  let nodesHealthy = true;
  if (await pteroConfigured()) {
    try {
      const nodes = await pteroApp.listNodes();
      nodeCount = nodes.data.length;
      nodesHealthy = nodes.data.every((n) => !n.attributes.maintenance_mode);
    } catch {
      nodeCount = null;
    }
  }

  const stats = [
    { icon: Users, label: "Customers", value: String(users), href: "/admin/customers" },
    { icon: Server, label: "Active services", value: String(activeOrders), href: "/admin/orders" },
    { icon: ShoppingCart, label: "Est. MRR", value: formatMoney(mrr), href: "/admin/orders" },
    { icon: LifeBuoy, label: "Open tickets", value: String(openTickets), href: "/admin/tickets" },
    {
      icon: Boxes,
      label: "Nodes",
      value: nodeCount === null ? "—" : `${nodeCount} ${nodesHealthy ? "✔" : "⚠"}`,
      href: "/admin/nodes",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        Platform <span className="text-gradient-hyper">overview</span>
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card glow>
              <CardBody className="py-5">
                <s.icon className="mb-2 h-5 w-5 text-hyper-400" />
                <p className="font-display text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-xs uppercase tracking-wider text-steel-faint">{s.label}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-10 font-display text-lg font-bold text-white">Recent orders</h2>
      <Card>
        <CardBody className="p-0">
          {recentOrders.length === 0 ? (
            <p className="py-12 text-center text-sm text-steel-faint">No orders yet.</p>
          ) : (
            <div className="scrollbar-slim overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-steel-faint">
                    <th className="px-5 py-3">Server</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-5 py-3 font-semibold text-white">{o.serverName}</td>
                      <td className="px-5 py-3 text-steel-dim">{o.user.email}</td>
                      <td className="px-5 py-3 text-steel-dim">{o.plan.name}</td>
                      <td className="px-5 py-3 text-steel-faint">{formatDate(o.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={o.status === "ACTIVE" ? "green" : o.status === "FAILED" ? "red" : "yellow"}>
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
