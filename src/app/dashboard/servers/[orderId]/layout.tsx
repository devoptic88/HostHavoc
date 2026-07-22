import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServerSidebar } from "@/components/dashboard/ServerSidebar";
import { ServerTopbar } from "@/components/dashboard/ServerTopbar";
import { ProvisioningScreen } from "@/components/dashboard/ProvisioningScreen";

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
  if (!order || (order.userId !== session.user.id && session.user.role !== "ADMIN")) {
    notFound();
  }

  // Game-server orders land here straight from checkout, often before the
  // webhook has finished provisioning — show live progress until the server
  // exists, then this layout re-renders into the real console.
  if (!order.pteroServerIdentifier) {
    if (
      order.productType !== "GAME_SERVER" ||
      order.status === "CANCELLED" ||
      order.status === "MANUAL"
    ) {
      notFound();
    }
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold italic text-white">
            {order.serverName}
          </h1>
          <p className="mt-1 text-sm text-steel-dim">{order.plan.name}</p>
        </div>
        <ProvisioningScreen
          orderId={order.id}
          serverName={order.serverName}
          initialStatus={order.status}
          initialError={order.errorMessage}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <ServerTopbar
        orderId={order.id}
        name={order.serverName}
        planName={order.plan.name}
        gameSlug={order.plan.gameSlug}
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <ServerSidebar orderId={order.id} gameSlug={order.plan.gameSlug} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
