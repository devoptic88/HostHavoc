import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pteroClient } from "@/lib/pterodactyl";
import { accountUsage } from "@/lib/accountUsage";

export const dynamic = "force-dynamic";

/**
 * Every backup the signed-in customer owns, grouped by server, plus the
 * account's storage quota. Usage is written back onto each order so the
 * sidebar meter doesn't have to fan out to the panel on every page load.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const orders = await db.order.findMany({
    where: {
      userId: session.user.id,
      status: { not: "CANCELLED" },
      pteroServerIdentifier: { not: null },
    },
    include: { plan: { select: { name: true, gameSlug: true } } },
    orderBy: { createdAt: "asc" },
  });

  const servers = await Promise.all(
    orders.map(async (order) => {
      try {
        const listing = await pteroClient.listBackups(order.pteroServerIdentifier!);
        const backups = listing.data
          .map((item) => item.attributes)
          .filter((backup) => backup.is_successful)
          .map((backup) => ({
            uuid: backup.uuid,
            name: backup.name,
            bytes: backup.bytes,
            locked: backup.is_locked,
            createdAt: backup.created_at,
          }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const bytes = backups.reduce((sum, backup) => sum + backup.bytes, 0);

        await db.order
          .update({ where: { id: order.id }, data: { backupBytes: BigInt(bytes) } })
          .catch(() => {});

        return {
          orderId: order.id,
          serverName: order.serverName,
          gameSlug: order.plan.gameSlug,
          bytes,
          backups,
          error: null as string | null,
        };
      } catch (err) {
        return {
          orderId: order.id,
          serverName: order.serverName,
          gameSlug: order.plan.gameSlug,
          bytes: Number(order.backupBytes),
          backups: [],
          error: err instanceof Error ? err.message : "Could not load backups",
        };
      }
    }),
  );

  const usage = await accountUsage(session.user.id);
  return NextResponse.json({
    servers,
    usedBytes: servers.reduce((sum, server) => sum + server.bytes, 0),
    quotaBytes: usage.backupQuotaBytes,
  });
}
