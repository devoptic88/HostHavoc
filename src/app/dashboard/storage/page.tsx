import { HardDrive } from "lucide-react";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { BackupsStorage } from "@/components/dashboard/BackupsStorage";

export const dynamic = "force-dynamic";

export default function BackupsStoragePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader
        icon={<HardDrive className="h-5 w-5" />}
        title="Backups Usage"
        description="Every backup across your servers, and how much of your storage they use."
      />
      <BackupsStorage />
    </div>
  );
}
