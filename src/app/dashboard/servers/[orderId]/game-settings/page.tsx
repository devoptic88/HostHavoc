import { Gamepad2 } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MinecraftSettings } from "@/components/dashboard/MinecraftSettings";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function GameSettingsPage({
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
        icon={<Gamepad2 className="h-5 w-5" />}
        title="Minecraft Server Settings"
        description="Configure basic game, world, gamemode, NPC, and advanced settings. Changes are written to server.properties."
      />
      <MinecraftSettings orderId={params.orderId} />
    </div>
  );
}
