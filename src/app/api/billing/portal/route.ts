import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { paymenterConfigured } from "@/lib/paymenter";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (!(await paymenterConfigured())) {
    return NextResponse.json(
      { error: "Billing portal is unavailable until Paymenter is configured." },
      { status: 501 },
    );
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.paymenterUserId) {
    return NextResponse.json(
      { error: "No billing profile yet — it's created on your first purchase." },
      { status: 404 },
    );
  }
  const baseUrl = (await getSetting("PAYMENTER_URL")).replace(/\/+$/, "");
  return NextResponse.json({ redirect: `${baseUrl}/account` });
}
