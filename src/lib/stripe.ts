import Stripe from "stripe";
import { getSetting } from "@/lib/settings";

let _stripe: { key: string; client: Stripe } | null = null;

/** Stripe client using the key from Admin → Settings (env fallback). */
export async function stripe(): Promise<Stripe> {
  const key = await getSetting("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Stripe secret key is not configured (Admin → Settings)");
  if (!_stripe || _stripe.key !== key) {
    _stripe = {
      key,
      client: new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion }),
    };
  }
  return _stripe.client;
}

export async function stripeConfigured(): Promise<boolean> {
  return Boolean(await getSetting("STRIPE_SECRET_KEY"));
}
