import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TicketThread } from "@/components/dashboard/TicketThread";

export const dynamic = "force-dynamic";

export default async function AdminTicketPage({
  params,
}: {
  params: { id: string };
}) {
  const ticket = await db.ticket.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <div>
      <p className="mx-auto mb-4 max-w-3xl text-xs text-steel-faint">
        Customer: {ticket.user.name} ({ticket.user.email})
      </p>
      <TicketThread ticket={ticket} messages={ticket.messages} />
    </div>
  );
}
