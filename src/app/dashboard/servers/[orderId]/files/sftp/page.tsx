import { KeyRound } from "lucide-react";
import { ServerSftp } from "@/components/dashboard/ServerSftp";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export default function ServerSftpPage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <SectionHeader
        icon={<KeyRound className="h-5 w-5" />}
        title="SFTP"
        description="Connect directly to your server with SFTP for large uploads and full file access."
      />
      <ServerSftp orderId={params.orderId} />
    </div>
  );
}
