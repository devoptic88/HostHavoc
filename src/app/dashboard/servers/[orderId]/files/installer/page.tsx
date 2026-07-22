import { PlusSquare } from "lucide-react";
import { ServerInstaller } from "@/components/dashboard/ServerInstaller";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export default function ServerInstallerPage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <SectionHeader
        icon={<PlusSquare className="h-5 w-5" />}
        title="One-Click Installer"
        description="Quickly change the version, mods, or install content into your server."
      />
      <ServerInstaller orderId={params.orderId} />
    </div>
  );
}
