import { Gamepad2 } from "lucide-react";
import { Startup } from "@/components/dashboard/Startup";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ServerStartupPage({
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
        icon={<Gamepad2 className="h-5 w-5" />}
        title="Game Settings"
        description="Configure basic game settings, startup arguments, and other advanced settings."
      />
      <Startup orderId={params.orderId} gameSlug={order.plan.gameSlug} />
    </div>
  );
}
