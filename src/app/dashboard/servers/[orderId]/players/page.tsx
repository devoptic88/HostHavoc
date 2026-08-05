import { Users } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MinecraftPlayers } from "@/components/dashboard/MinecraftPlayers";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { plan: true },
  });
  if (!order || order.plan.gameSlug !== "minecraft") notFound();

  return (
    <div>
      <SectionHeader
        icon={<Users className="h-5 w-5" />}
        title="Players"
        description="Manage who can join your server, who can run commands, and who is banned."
      />
      <MinecraftPlayers orderId={params.orderId} />
    </div>
  );
}
