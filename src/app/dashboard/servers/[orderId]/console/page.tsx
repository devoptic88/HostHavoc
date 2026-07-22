import { TerminalSquare } from "lucide-react";
import { Console } from "@/components/dashboard/Console";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export default function ServerConsolePage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <div>
      <SectionHeader
        icon={<TerminalSquare className="h-5 w-5" />}
        title="Console"
        description="Get access to your server's live logs and run commands."
      />
      <Console orderId={params.orderId} />
    </div>
  );
}
