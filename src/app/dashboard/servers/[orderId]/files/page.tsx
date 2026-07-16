import { FileManager } from "@/components/dashboard/FileManager";

export default function ServerFilesPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <FileManager orderId={params.orderId} />;
}
