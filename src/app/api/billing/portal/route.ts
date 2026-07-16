import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, stripeConfigured } from "@/lib/stripe";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing portal is unavailable until Stripe is configured." },
      { status: 501 },
    );
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing profile yet — it's created on your first purchase." },
      { status: 404 },
    );
  }
  const portal = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`,
  });
  return NextResponse.json({ redirect: portal.url });
}
