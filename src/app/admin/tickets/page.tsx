import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { ticketTone } from "@/components/dashboard/ticketTone";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const tickets = await db.ticket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { user: true },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        Ticket <span className="text-gradient-hyper">queue</span>
      </h1>
      {tickets.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center text-sm text-steel-faint">
            Queue is empty. Enjoy it while it lasts.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/tickets/${t.id}`} className="block">
              <Card glow>
                <CardBody className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{t.subject}</p>
                    <p className="text-xs text-steel-faint">
                      {t.user.email} · {t.priority} · updated {formatDate(t.updatedAt)}
                    </p>
                  </div>
                  <Badge tone={ticketTone[t.status]}>{t.status.replace("_", " ")}</Badge>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
