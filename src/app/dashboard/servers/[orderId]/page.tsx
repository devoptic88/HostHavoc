import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ServerOverview } from "@/components/dashboard/ServerOverview";

export const dynamic = "force-dynamic";

export default async function ServerOverviewPage({
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
    <ServerOverview
      orderId={order.id}
      name={order.serverName}
      planName={order.plan.name}
      gameSlug={order.plan.gameSlug}
      ramMb={order.plan.ramMb}
      cpuPercent={order.plan.cpuPercent}
      diskMb={order.plan.diskMb}
      priceMonthly={Number(order.plan.priceMonthly)}
      orderStatus={order.status}
    />
  );
}
