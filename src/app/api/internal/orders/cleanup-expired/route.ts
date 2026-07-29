import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cleanupExpiredOrders } from "@/lib/provision";

function authorizedBySecret(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function authorize(req: Request) {
  if (authorizedBySecret(req)) return true;
  const session = await auth();
  return session?.user.role === "ADMIN";
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await cleanupExpiredOrders();
  return NextResponse.json({
    now: new Date().toISOString(),
    cleaned: results.filter((result) => result.ok).length,
    results,
  });
}
