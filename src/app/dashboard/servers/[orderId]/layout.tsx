import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServerHeader } from "@/components/dashboard/ServerHeader";
import { ServerTabs } from "@/components/dashboard/ServerTabs";

export const dynamic = "force-dynamic";

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orderId: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { plan: true },
  });
  if (
    !order ||
    (order.userId !== session.user.id && session.user.role !== "ADMIN") ||
    !order.pteroServerIdentifier
  ) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ServerHeader
        orderId={order.id}
        name={order.serverName}
        planName={order.plan.name}
      />
      <ServerTabs orderId={order.id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
