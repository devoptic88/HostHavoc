import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { createTicket } from "./actions";
import { ticketTone } from "@/components/dashboard/ticketTone";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const session = await auth();
  const tickets = await db.ticket.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-6 font-display text-2xl font-extrabold italic text-white">
          Support <span className="text-gradient-hyper">tickets</span>
        </h1>
        {tickets.length === 0 ? (
          <Card>
            <CardBody className="py-14 text-center">
              <LifeBuoy className="mx-auto h-9 w-9 text-steel-faint" />
              <p className="mt-3 text-sm text-steel-dim">
                No tickets yet. Need a hand? Open one — median first response is
                under 10 minutes.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link key={t.id} href={`/dashboard/tickets/${t.id}`} className="block">
                <Card glow>
                  <CardBody className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{t.subject}</p>
                      <p className="text-xs text-steel-faint">
                        Updated {formatDate(t.updatedAt)}
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

      <Card className="h-fit">
        <CardBody>
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-white">
            <Plus className="h-4 w-4 text-hyper-400" /> Open a ticket
          </h2>
          <form action={createTicket} className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" required maxLength={120} />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High — service down</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                name="body"
                required
                placeholder="Describe the issue — include your server name and any error messages."
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
