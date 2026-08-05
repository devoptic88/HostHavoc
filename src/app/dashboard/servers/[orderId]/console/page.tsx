import { TerminalSquare } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Console } from "@/components/dashboard/Console";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function ServerConsolePage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    select: { streamerMode: true },
  });
  if (!order) notFound();

  return (
    <div>
      <SectionHeader
        icon={<TerminalSquare className="h-5 w-5" />}
        title="Console"
        description="Get access to your server's live logs and run commands."
      />
      <Console orderId={params.orderId} streamerMode={order.streamerMode} />
    </div>
  );
}
