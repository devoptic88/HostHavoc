import { Share2 } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SectionHeader } from "@/components/dashboard/SectionHeader";

export const dynamic = "force-dynamic";

export default async function ServerShareSettingsPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await db.order.findUnique({ where: { id: params.orderId } });
  if (!order) notFound();

  return (
    <div>
      <SectionHeader
        icon={<Share2 className="h-5 w-5" />}
        title="Share Settings"
        description="Invite others to view or manage this server."
      />
      <div className="glass rounded-2xl p-6">
        <p className="text-sm text-steel-dim">Coming soon.</p>
      </div>
    </div>
  );
}
