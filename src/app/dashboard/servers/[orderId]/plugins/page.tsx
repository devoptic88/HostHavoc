import { Puzzle } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MinecraftPlugins } from "@/components/dashboard/MinecraftPlugins";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function PluginsPage({
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
        icon={<Puzzle className="h-5 w-5" />}
        title="Plugins"
        description="Browse and install plugins from SpigotMC for Paper, Purpur, Spigot, and Bukkit servers."
      />
      <MinecraftPlugins orderId={params.orderId} />
    </div>
  );
}
