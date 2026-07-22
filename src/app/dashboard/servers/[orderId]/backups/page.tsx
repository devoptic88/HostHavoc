import { History } from "lucide-react";
import { Backups } from "@/components/dashboard/Backups";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export default function ServerBackupsPage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <SectionHeader
        icon={<History className="h-5 w-5" />}
        title="Backups"
        description="Create and restore point-in-time backups of your server."
      />
      <Backups orderId={params.orderId} />
    </div>
  );
}
