import { db } from "@/lib/db";

/** Order statuses that occupy a deploy slot (a live server on the panel). */
export const DEPLOYED_STATUSES = [
  "ACTIVE",
  "PROVISIONING",
  "PENDING",
  "GRACE_PERIOD",
  "SUSPENDED",
  "MANUAL",
] as const;

/**
 * Slot and storage usage for a customer. Slots are summed from each order's
 * plan rather than read off a single subscription, because a customer can hold
 * several plans at once and each one contributes its own allowance.
 */
export async function accountUsage(userId: string) {
  const orders = await db.order.findMany({
    where: { userId, status: { not: "CANCELLED" } },
    select: {
      status: true,
      backupBytes: true,
      plan: {
        select: { tier: true, deploySlots: true, saveSlots: true, backupStorageMb: true },
      },
    },
  });

  let deployed = 0;
  let saved = 0;
  let deploySlots = 0;
  let saveSlots = 0;
  let backupQuotaMb = 0;
  let backupBytes = 0;

  for (const order of orders) {
    if (order.status === "HIBERNATING") saved += 1;
    else deployed += 1;

    deploySlots += order.plan.deploySlots;
    saveSlots += order.plan.tier === "LITE" ? order.plan.saveSlots : 0;
    backupQuotaMb += order.plan.backupStorageMb;
    backupBytes += Number(order.backupBytes);
  }

  return {
    deployed,
    saved,
    deploySlots,
    saveSlots,
    backupBytes,
    backupQuotaBytes: backupQuotaMb * 1024 * 1024,
  };
}

/** Compact size for quota readouts, e.g. "3.77GB" / "20GB". */
export function formatQuotaBytes(bytes: number) {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(2)}GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)}MB`;
}
