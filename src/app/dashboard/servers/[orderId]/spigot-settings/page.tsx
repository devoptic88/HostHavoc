import { SlidersHorizontal } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MinecraftSpigotSettings } from "@/components/dashboard/MinecraftSpigotSettings";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function SpigotSettingsPage({
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
        icon={<SlidersHorizontal className="h-5 w-5" />}
        title="Spigot Settings"
        description="Tune entity behaviour, player messages, spawn limits, and tick rates. Written to spigot.yml and bukkit.yml."
      />
      <MinecraftSpigotSettings orderId={params.orderId} />
    </div>
  );
}
