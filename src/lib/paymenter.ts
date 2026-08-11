import { getSetting } from "@/lib/settings";
import { db } from "@/lib/db";
import type { Plan, User } from "@prisma/client";

/**
 * Thin REST client for Paymenter's admin API (bearer-token auth, JSON:API
 * style responses). HyperNode uses this only to keep a Paymenter user +
 * product in sync and to place/cancel orders — Paymenter itself owns
 * invoicing/dunning; provisioning is relayed back into HyperNode by a small
 * Paymenter server extension calling src/app/api/paymenter/[action].
 */

export class PaymenterError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Paymenter API error ${status}: ${JSON.stringify(body)}`);
  }
}

export async function paymenterConfigured(): Promise<boolean> {
  return Boolean((await getSetting("PAYMENTER_URL")) && (await getSetting("PAYMENTER_API_KEY")));
}

async function paymenterRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const baseUrl = (await getSetting("PAYMENTER_URL")).replace(/\/+$/, "");
  const apiKey = await getSetting("PAYMENTER_API_KEY");
  if (!baseUrl || !apiKey) {
    throw new Error("Paymenter is not configured (Admin -> Settings)");
  }

  const res = await fetch(`${baseUrl}/api/v1/admin${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new PaymenterError(res.status, json);
  }
  return json as T;
}

type PaymenterUserResource = { data: { id: number } };
type PaymenterProductResource = { data: { id: number } };
type PaymenterOrderResource = { data: { id: number; checkout_url?: string; url?: string } };

/**
 * Look up (by email) or create the Paymenter user backing this HyperNode
 * account, and persist its id. Exact field names for search/create are a
 * best guess pending confirmation against the live Paymenter instance's own
 * API reference — adjust here only, callers are unaffected.
 */
export async function findOrCreatePaymenterUser(user: Pick<User, "id" | "email" | "name" | "paymenterUserId">): Promise<number> {
  if (user.paymenterUserId) return user.paymenterUserId;

  const existing = await paymenterRequest<{ data: { id: number }[] }>(
    "GET",
    `/users?filter[email]=${encodeURIComponent(user.email)}`,
  ).catch(() => null);
  const found = existing?.data?.[0]?.id;

  const id =
    found ??
    (
      await paymenterRequest<PaymenterUserResource>("POST", "/users", {
        email: user.email,
        name: user.name,
      })
    ).data.id;

  await db.user.update({ where: { id: user.id }, data: { paymenterUserId: id } });
  return id;
}

/**
 * Look up or lazily create the Paymenter product backing this HyperNode
 * plan, mirroring how a Stripe price used to be created on first checkout.
 */
export async function findOrCreatePaymenterProduct(plan: Pick<Plan, "id" | "name" | "priceMonthly" | "paymenterProductId">): Promise<number> {
  if (plan.paymenterProductId) return plan.paymenterProductId;

  const created = await paymenterRequest<PaymenterProductResource>("POST", "/products", {
    name: `HyperNode — ${plan.name}`,
    pricing_type: "recurring",
    prices: [{ currency_code: "USD", price: Number(plan.priceMonthly), billing_period: "monthly" }],
  });

  await db.plan.update({ where: { id: plan.id }, data: { paymenterProductId: created.data.id } });
  return created.data.id;
}

/**
 * Admin-creates a Paymenter order for a user/product, stamping the
 * HyperNode order id so the server extension can relay lifecycle events
 * back to the right order. Returns the Paymenter order id and a URL the
 * customer can be sent to in order to pay it.
 */
export async function createPaymenterOrder(
  paymenterUserId: number,
  paymenterProductId: number,
  hypernodeOrderId: string,
): Promise<{ paymenterOrderId: number; paymentUrl: string }> {
  const created = await paymenterRequest<PaymenterOrderResource>("POST", "/orders", {
    user_id: paymenterUserId,
    products: [{ product_id: paymenterProductId }],
    metadata: { hypernode_order_id: hypernodeOrderId },
  });

  const baseUrl = (await getSetting("PAYMENTER_URL")).replace(/\/+$/, "");
  const paymentUrl = created.data.checkout_url ?? created.data.url ?? `${baseUrl}/orders/${created.data.id}`;
  return { paymenterOrderId: created.data.id, paymentUrl };
}

export async function cancelPaymenterOrder(paymenterOrderId: number): Promise<void> {
  await paymenterRequest("DELETE", `/orders/${paymenterOrderId}`).catch(() => {});
}
