import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { ticketTone } from "@/components/dashboard/ticketTone";
import { formatDate } from "@/lib/utils";
import { createTicket } from "./actions";

export const dynamic = "force-dynamic";

const topicSubject: Record<string, string> = {
  provisioning: "Provisioning assistance needed",
  operations: "Server operations help needed",
  performance: "Performance tuning request",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams?: { server?: string; topic?: string };
}) {
  const session = await auth();
  const userId = session!.user.id;
  const [tickets, orders] = await Promise.all([
    db.ticket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    db.order.findMany({
      where: { userId, status: { not: "CANCELLED" } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const selectedOrderId =
    searchParams?.server && orders.some((order) => order.id === searchParams.server)
      ? searchParams.server
      : "";
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const topic = searchParams?.topic ?? "";
  const subjectPreset =
    selectedOrder && topic
      ? `${selectedOrder.serverName} - ${topicSubject[topic] ?? "Support request"}`
      : selectedOrder
        ? `${selectedOrder.serverName} - Support request`
        : topic
          ? topicSubject[topic] ?? ""
          : "";

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-6 font-display text-2xl font-extrabold italic text-white">
          Support <span className="text-gradient-hyper">tickets</span>
        </h1>
        {selectedOrder ? (
          <div className="mb-5 rounded-2xl border border-hyper-400/20 bg-hyper-500/10 px-4 py-4 text-sm text-steel">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-hyper-300">
              Server context attached
            </p>
            <p className="mt-2 text-white">{selectedOrder.serverName}</p>
            <p className="mt-1 text-steel-dim">
              {selectedOrder.plan.name} - the opening message will include this server automatically.
            </p>
          </div>
        ) : null}

        {tickets.length === 0 ? (
          <Card>
            <CardBody className="py-14 text-center">
              <LifeBuoy className="mx-auto h-9 w-9 text-steel-faint" />
              <p className="mt-3 text-sm text-steel-dim">
                No tickets yet. Need a hand? Open one and we will pick it up from the support queue.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block">
                <Card glow>
                  <CardBody className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{ticket.subject}</p>
                      <p className="text-xs text-steel-faint">
                        Updated {formatDate(ticket.updatedAt)}
                      </p>
                    </div>
                    <Badge tone={ticketTone[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card className="h-fit">
        <CardBody>
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-white">
            <Plus className="h-4 w-4 text-hyper-400" /> Open a ticket
          </h2>
          <form action={createTicket} className="space-y-4">
            <input type="hidden" name="topic" value={topic} />
            <div>
              <Label htmlFor="orderId">Server context</Label>
              <Select id="orderId" name="orderId" defaultValue={selectedOrderId}>
                <option value="">General account / billing issue</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.serverName} - {order.plan.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" required maxLength={120} defaultValue={subjectPreset} />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High - service down</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                name="body"
                required
                placeholder={
                  selectedOrder
                    ? "Describe the issue, what you expected, and any errors from the overview, console, or file manager."
                    : "Describe the issue and include any relevant server names or error messages."
                }
              />
            </div>
            <Button type="submit" className="w-full">
              Submit ticket
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
