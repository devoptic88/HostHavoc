import { Databases } from "@/components/dashboard/Databases";

export default function ServerDatabasesPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <Databases orderId={params.orderId} />;
}
