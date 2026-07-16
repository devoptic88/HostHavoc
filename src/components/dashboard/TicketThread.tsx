import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatDate, cn } from "@/lib/utils";
import { replyTicket, closeTicket } from "@/app/dashboard/tickets/actions";
import { ticketTone } from "./ticketTone";

interface Message {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: Date;
  author: { name: string };
}

export function TicketThread({
  ticket,
  messages,
}: {
  ticket: { id: string; subject: string; status: string; priority: string };
  messages: Message[];
}) {
  const closed = ticket.status === "CLOSED";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-white">{ticket.subject}</h1>
          <p className="mt-1 text-xs text-steel-faint">Priority: {ticket.priority}</p>
        </div>
        <Badge tone={ticketTone[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
      </div>

      <div className="space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "glass rounded-2xl p-5",
              m.fromStaff && "border-hyper-500/30 bg-hyper-500/[0.04]",
            )}
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className={cn("font-bold", m.fromStaff ? "text-hyper-300" : "text-white")}>
                {m.author.name}
                {m.fromStaff && " · HyperNode Staff"}
              </span>
              <span className="text-steel-faint">{formatDate(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-steel">{m.body}</p>
          </div>
        ))}
      </div>

      {!closed ? (
        <form action={replyTicket} className="mt-6 space-y-3">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <Textarea name="body" required placeholder="Write a reply…" />
          <div className="flex justify-between">
            <Button type="submit" formAction={closeTicket} variant="ghost" size="sm">
              Close ticket
            </Button>
            <Button type="submit">Send reply</Button>
          </div>
        </form>
      ) : (
        <p className="mt-6 text-center text-sm text-steel-faint">
          This ticket is closed. Open a new one if you need anything else.
        </p>
      )}
    </div>
  );
}
