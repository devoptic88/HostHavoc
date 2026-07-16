import { Console } from "@/components/dashboard/Console";

export default function ServerConsolePage({
  params,
}: {
  params: { orderId: string };
}) {
  return <Console orderId={params.orderId} />;
}
