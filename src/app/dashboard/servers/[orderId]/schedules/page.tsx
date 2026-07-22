import { Repeat } from "lucide-react";
import { Schedules } from "@/components/dashboard/Schedules";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export default function ServerSchedulesPage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <SectionHeader
        icon={<Repeat className="h-5 w-5" />}
        title="Automated Tasks"
        description="Schedule recurring actions like backups, restarts, and commands."
      />
      <Schedules orderId={params.orderId} />
    </div>
  );
}
