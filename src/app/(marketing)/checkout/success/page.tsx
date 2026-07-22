import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ButtonLink } from "@/components/ui/Button";
import { provisionOrder } from "@/lib/provision";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const order = searchParams.order
    ? await db.order.findFirst({
        where: { id: searchParams.order, userId: session.user.id },
        include: { plan: true },
      })
    : null;

  if (
    order?.productType === "GAME_SERVER" &&
    !order.pteroServerIdentifier &&
    order.status === "PENDING" &&
    Boolean(order.stripeSubscriptionId)
  ) {
    await provisionOrder(order.id).catch(() => {});
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-6 font-display text-3xl font-extrabold italic text-white">
          Order <span className="text-gradient-hyper">confirmed</span>
        </h1>
        <p className="mt-4 text-steel-dim">
          {order?.productType === "GAME_SERVER"
            ? `"${order.serverName}" is being provisioned right now — jump in and watch the installation live.`
            : "Your order is confirmed. Our team will complete the setup and email you the access details shortly."}
        </p>
        <div className="mt-8">
          {order?.productType === "GAME_SERVER" ? (
            <ButtonLink href={`/dashboard/servers/${order.id}`} size="lg">
              Take me to my server →
            </ButtonLink>
          ) : (
            <ButtonLink href="/dashboard" size="lg">
              Go to your dashboard
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
