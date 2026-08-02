import { PlusSquare } from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { OxidePluginInstaller } from "@/components/dashboard/OxidePluginInstaller";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { db } from "@/lib/db";

export default async function ServerPluginInstallerPage({
  params,
}: {
  params: { orderId: string };
}) {
  const session = await auth();
  if (!session?.user) notFound();

  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { plan: true },
  });

  if (
    !order ||
    (order.userId !== session.user.id && session.user.role !== "ADMIN") ||
    order.plan.gameSlug !== "rust" ||
    order.rustInstallProfile !== "oxide"
  ) {
    notFound();
  }

  return (
    <div>
      <SectionHeader
        icon={<PlusSquare className="h-5 w-5" />}
        title="Plugin Installer"
        description="Install Oxide / uMod plugins from direct download links."
      />
      <OxidePluginInstaller orderId={params.orderId} />
    </div>
  );
}
