import { Settings } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ServerSettings } from "@/components/dashboard/ServerSettings";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function ServerSettingsPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { plan: true },
  });
  if (!order) notFound();
  return (
    <div>
      <SectionHeader
        icon={<Settings className="h-5 w-5" />}
        title="Manage Instance"
        description="Manage your instance nickname and other advanced settings."
      />
      <ServerSettings
        orderId={order.id}
        currentName={order.serverName}
        gameSlug={order.plan.gameSlug}
      />
    </div>
  );
}
