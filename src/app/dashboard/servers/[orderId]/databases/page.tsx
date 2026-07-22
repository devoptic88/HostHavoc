import { Database } from "lucide-react";
import { Databases } from "@/components/dashboard/Databases";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export default function ServerDatabasesPage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <SectionHeader
        icon={<Database className="h-5 w-5" />}
        title="Databases"
        description="Add hosted databases to your game server for added functionality required by mods, plugins, and more."
      />
      <Databases orderId={params.orderId} />
    </div>
  );
}
