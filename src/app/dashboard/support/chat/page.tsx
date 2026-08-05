import { MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { LiveChatButton } from "@/components/dashboard/LiveChatButton";
import { getSetting, intercomAppId } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LiveChatPage() {
  const [appId, hours] = await Promise.all([intercomAppId(), getSetting("SUPPORT_HOURS")]);

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        icon={<MessageCircle className="h-5 w-5" />}
        title="Live Chat"
        description="Talk to a human about your server in real time."
      />
      <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.9))]">
        <CardBody className="py-10 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-steel-faint" />
          {appId ? (
            <>
              <p className="mt-4 font-display text-lg font-bold text-white">
                We&apos;re one message away
              </p>
              {hours && <p className="mt-2 text-sm text-steel-dim">Support hours: {hours}</p>}
              <LiveChatButton configured className="mt-6 flex justify-center" />
              <p className="mt-3 text-xs text-steel-faint">
                Outside of support hours your message becomes a ticket and we reply by email.
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 font-display text-lg font-bold text-white">
                Live chat isn&apos;t switched on yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-steel-dim">
                Add an Intercom workspace ID in Admin → Settings to turn on the messenger. Until
                then, tickets are the fastest way to reach us.
              </p>
              <div className="mt-6">
                <ButtonLink href="/dashboard/tickets" size="sm">
                  Open a ticket
                </ButtonLink>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
