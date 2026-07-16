import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketThread } from "@/components/dashboard/TicketThread";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const ticket = await db.ticket.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!ticket || ticket.userId !== session!.user.id) notFound();

  return <TicketThread ticket={ticket} messages={ticket.messages} />;
}
