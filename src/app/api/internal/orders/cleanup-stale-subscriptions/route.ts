import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cleanupStaleSubscriptions } from "@/lib/provision";

/**
 * One-time repair endpoint for orders that were cancelled before
 * terminateOrder() started cancelling the underlying Stripe subscription.
 * Admin-only, dry run unless ?apply=1 is passed.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apply = new URL(req.url).searchParams.get("apply") === "1";
  const report = await cleanupStaleSubscriptions(!apply);
  return NextResponse.json(report);
}
