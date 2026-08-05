import { Users } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function ServerUserPermissionsPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await db.order.findUnique({ where: { id: params.orderId } });
  if (!order) notFound();

  return (
    <div>
      <SectionHeader
        icon={<Users className="h-5 w-5" />}
        title="User Permissions"
        description="Control what invited users can see and do on this server."
      />
      <div className="glass rounded-2xl p-6">
        <p className="text-sm text-steel-dim">Coming soon.</p>
      </div>
    </div>
  );
}
