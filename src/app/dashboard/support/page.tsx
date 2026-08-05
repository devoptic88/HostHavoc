import { BookOpen, Clock, LifeBuoy, MessageCircle, Phone, Ticket } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { LiveChatButton } from "@/components/dashboard/LiveChatButton";
import { getSetting, intercomAppId } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SupportCenterPage() {
  const [appId, hours, phone] = await Promise.all([
    intercomAppId(),
    getSetting("SUPPORT_HOURS"),
    getSetting("SUPPORT_PHONE"),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader
        icon={<LifeBuoy className="h-5 w-5" />}
        title="Support Center"
        description="It's dangerous to build servers alone. HyperNode is here to help."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.9))]">
          <CardBody>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <BookOpen className="h-4 w-4 text-hyper-400" /> Search the knowledge base
            </h2>
            <p className="mt-2 text-sm text-steel-dim">
              Help articles and step-by-step guides for the most common questions and issues.
            </p>
            <div className="mt-5">
              <ButtonLink href="/wiki" variant="secondary" size="sm">
                Open knowledge base
              </ButtonLink>
            </div>
          </CardBody>
        </Card>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.9))]">
          <CardBody>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <MessageCircle className="h-4 w-4 text-hyper-400" /> Get human help
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              {hours && (
                <p className="flex items-start gap-2 text-steel">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-steel-faint" />
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.2em] text-steel-faint">
                      Support hours
                    </span>
                    {hours}
                  </span>
                </p>
              )}
              {phone && (
                <p className="flex items-start gap-2 text-steel">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-steel-faint" />
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.2em] text-steel-faint">
                      Phone
                    </span>
                    {phone}
                  </span>
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <LiveChatButton configured={Boolean(appId)} />
              <ButtonLink href="/dashboard/tickets" variant="secondary" size="sm">
                <Ticket className="h-4 w-4" /> Tickets
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4 border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.9))]">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Still stuck?</h2>
            <p className="mt-1 text-sm text-steel-dim">
              Open a ticket and we&apos;ll dig into your server with you.
            </p>
          </div>
          <Link
            href="/dashboard/tickets"
            className="text-sm font-semibold text-hyper-300 hover:text-white"
          >
            Go to tickets →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
