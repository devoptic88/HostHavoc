import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { db } from "@/lib/db";
import { provisionOrder, suspendOrder, terminateOrder, unsuspendOrder } from "@/lib/provision";

export async function POST(req: Request) {
  const secret = await getSetting("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = (await stripe()).webhooks.constructEvent(payload, signature ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Invoice→subscription id across Stripe API versions (top-level field on
  // older versions, nested under parent.subscription_details on newer ones).
  const invoiceSubId = (invoice: Stripe.Invoice): string | null => {
    const legacy = (invoice as unknown as { subscription?: unknown }).subscription;
    if (typeof legacy === "string") return legacy;
    const nested = invoice.parent?.subscription_details?.subscription;
    return typeof nested === "string" ? nested : null;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        if (typeof session.subscription === "string") {
          await db.order.update({
            where: { id: orderId },
            data: { stripeSubscriptionId: session.subscription },
          });
        }
        await provisionOrder(orderId).catch((err) =>
          console.error(`Provisioning failed for order ${orderId}:`, err),
        );
      }
      break;
    }
    case "invoice.payment_failed": {
      const subId = invoiceSubId(event.data.object);
      if (subId) {
        const order = await db.order.findUnique({
          where: { stripeSubscriptionId: subId },
        });
        if (order) await suspendOrder(order.id).catch(console.error);
      }
      break;
    }
    case "invoice.paid": {
      const subId = invoiceSubId(event.data.object);
      if (subId) {
        const order = await db.order.findUnique({
          where: { stripeSubscriptionId: subId },
        });
        if (order?.status === "SUSPENDED") {
          await unsuspendOrder(order.id).catch(console.error);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const order = await db.order.findUnique({
        where: { stripeSubscriptionId: sub.id },
      });
      if (order) await terminateOrder(order.id).catch(console.error);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
