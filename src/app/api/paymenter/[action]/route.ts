import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSetting } from "@/lib/settings";
import { db } from "@/lib/db";
import {
  provisionOrder,
  scheduleOrderTermination,
  suspendOrder,
  unsuspendOrder,
} from "@/lib/provision";

/**
 * Server-to-server relay called by the Paymenter extension's lifecycle
 * methods (createServer/suspendServer/unsuspendServer/terminateServer).
 * Not session-authenticated — guarded by a shared secret instead.
 */

function timingSafeEqualStrings(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request, { params }: { params: { action: string } }) {
  const expected = await getSetting("PAYMENTER_EXTENSION_SECRET");
  const provided = req.headers.get("x-paymenter-secret") ?? "";
  if (!expected || !timingSafeEqualStrings(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const paymenterOrderId = Number(body?.paymenterOrderId);
  const hypernodeOrderId = typeof body?.hypernodeOrderId === "string" ? body.hypernodeOrderId : null;

  const order = hypernodeOrderId
    ? await db.order.findUnique({ where: { id: hypernodeOrderId } })
    : Number.isFinite(paymenterOrderId)
      ? await db.order.findUnique({ where: { paymenterOrderId } })
      : null;

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    switch (params.action) {
      case "provision":
        await provisionOrder(order.id);
        break;
      case "suspend":
        await suspendOrder(order.id);
        break;
      case "unsuspend":
        await unsuspendOrder(order.id);
        break;
      case "terminate":
        await scheduleOrderTermination(order.id);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    }
  } catch (err) {
    console.error(`[paymenter] ${params.action} failed for order ${order.id}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
