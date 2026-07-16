import { Backups } from "@/components/dashboard/Backups";

export default function ServerBackupsPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <Backups orderId={params.orderId} />;
}
