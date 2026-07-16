import { Startup } from "@/components/dashboard/Startup";

export default function ServerStartupPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <Startup orderId={params.orderId} />;
}
