import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ServerSettings } from "@/components/dashboard/ServerSettings";

export const dynamic = "force-dynamic";

export default async function ServerSettingsPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await db.order.findUnique({ where: { id: params.orderId } });
  if (!order) notFound();
  return <ServerSettings orderId={order.id} currentName={order.serverName} />;
}
