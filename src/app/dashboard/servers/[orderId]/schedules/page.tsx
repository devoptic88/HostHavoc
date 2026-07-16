import { Schedules } from "@/components/dashboard/Schedules";

export default function ServerSchedulesPage({
  params,
}: {
  params: { orderId: string };
}) {
  return <Schedules orderId={params.orderId} />;
}
