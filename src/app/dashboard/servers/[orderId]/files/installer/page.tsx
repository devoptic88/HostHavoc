import { PlusSquare } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ServerInstaller } from "@/components/dashboard/ServerInstaller";
import { MinecraftInstaller } from "@/components/dashboard/MinecraftInstaller";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function ServerInstallerPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { plan: true },
  });
  if (!order) notFound();
  const isMinecraft = order.plan.gameSlug === "minecraft";

  return (
    <div>
      <SectionHeader
        icon={<PlusSquare className="h-5 w-5" />}
        title="One-Click Installer"
        description="Quickly change the version, mods, or install content into your server."
      />
      {isMinecraft ? (
        <MinecraftInstaller orderId={params.orderId} />
      ) : (
        <ServerInstaller orderId={params.orderId} />
      )}
    </div>
  );
}
