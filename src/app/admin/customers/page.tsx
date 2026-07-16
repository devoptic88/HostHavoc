import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { toggleRole } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true, tickets: true } } },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        <span className="text-gradient-hyper">Customers</span>
      </h1>
      <Card>
        <CardBody className="p-0">
          <div className="scrollbar-slim overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-steel-faint">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3">Tickets</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3 font-semibold text-white">{u.name}</td>
                    <td className="px-5 py-3 text-steel-dim">{u.email}</td>
                    <td className="px-5 py-3 text-steel-dim">{u._count.orders}</td>
                    <td className="px-5 py-3 text-steel-dim">{u._count.tickets}</td>
                    <td className="px-5 py-3 text-steel-faint">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={u.role === "ADMIN" ? "violet" : "steel"}>{u.role}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <form action={toggleRole}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button size="sm" variant="ghost" type="submit">
                          {u.role === "ADMIN" ? "Demote" : "Make admin"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
