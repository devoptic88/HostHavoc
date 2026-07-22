import { FolderOpen } from "lucide-react";
import { FileManager } from "@/components/dashboard/FileManager";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export default function ServerFilesPage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <SectionHeader
        icon={<FolderOpen className="h-5 w-5" />}
        title="File Manager"
        description="Directly edit, move, and make changes to your server files."
      />
      <FileManager orderId={params.orderId} />
    </div>
  );
}
