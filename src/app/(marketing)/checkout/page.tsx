import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { priceFor } from "@/content/games";
import { VPS_PLANS, DEDICATED_PLANS } from "@/content/plans";
import { CheckoutForm } from "@/components/marketing/CheckoutForm";
import { getDisplayLocations } from "@/lib/locations";
import { gameBySlug } from "@/lib/plans";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

type Search = {
  game?: string;
  units?: string;
  location?: string;
  product?: string;
  plan?: string;
  billing?: string;
  promo?: string;
  cancelled?: string;
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await auth();
  if (!session?.user) {
    const qs = new URLSearchParams(searchParams as Record<string, string>).toString();
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?${qs}`)}`);
  }

  const billingInterval = searchParams.billing === "year" ? "year" : "month";
  const promoCode = searchParams.promo?.trim() || undefined;

  let summary: {
    title: string;
    detail: string;
    price: number;
    billingLabel: string;
    billingDetail: string;
    payload: Record<string, unknown>;
    locationName?: string;
  } | null = null;

  if (searchParams.product === "vps" || searchParams.product === "dedicated") {
    const plan =
      searchParams.product === "vps"
        ? VPS_PLANS.find((p) => p.id === searchParams.plan)
        : DEDICATED_PLANS.find((p) => p.id === searchParams.plan);
    if (plan) {
      summary = {
        title: "name" in plan ? `VPS - ${plan.name}` : `Dedicated - ${plan.cpu}`,
        detail:
          "name" in plan
            ? `${plan.ram} GB RAM - ${plan.vcpu} vCPU - ${plan.disk} GB NVMe`
            : `${plan.cores} - ${plan.ram} - ${plan.disk}`,
        price:
          billingInterval === "year"
            ? Math.round(plan.price * 12 * 0.9 * 100) / 100
            : plan.price,
        billingLabel: billingInterval === "year" ? "Annual commitment" : "Monthly billing",
        billingDetail:
          billingInterval === "year"
            ? "10% annual discount applied before any valid promotion code."
            : "Month-to-month billing with promotion code support at checkout.",
        payload: {
          product: searchParams.product,
          plan: plan.id,
          billingInterval,
          promoCode,
        },
      };
    }
  } else if (searchParams.game) {
    const game = gameBySlug(searchParams.game);
    const units = Number(searchParams.units);
    if (game && game.slotOptions.includes(units)) {
      const { locations } = await getDisplayLocations();
      const loc = locations.find((l) => l.id === Number(searchParams.location));
      summary = {
        title: `${game.name} Server`,
        detail: `${units} ${game.pricingUnit === "gb" ? "GB RAM" : "player slots"}`,
        price:
          billingInterval === "year"
            ? Math.round(priceFor(game, units) * 12 * 0.9 * 100) / 100
            : priceFor(game, units),
        billingLabel: billingInterval === "year" ? "Annual commitment" : "Monthly billing",
        billingDetail:
          billingInterval === "year"
            ? "Billed yearly at a 10% discount. Promotion codes are applied during checkout when valid."
            : "Month-to-month billing with immediate provisioning after payment confirmation.",
        payload: {
          game: game.slug,
          units,
          location: loc?.id ?? locations[0]?.id,
          billingInterval,
          promoCode,
        },
        locationName: loc?.long ?? locations[0]?.long,
      };
    }
  }

  if (!summary) redirect("/games");

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="text-center font-display text-3xl font-extrabold italic text-white">
          Checkout <span className="text-gradient-hyper">review</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-steel-dim">
          Finalize the server identity and we will route you into secure billing, then straight into transparent provisioning and the operational overview.
        </p>
        {searchParams.cancelled ? (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-center text-sm text-warning">
            Payment was cancelled. Your configuration is still loaded below.
          </p>
        ) : null}
        <CheckoutForm
          title={summary.title}
          detail={summary.detail}
          locationName={summary.locationName}
          price={summary.price}
          billingLabel={summary.billingLabel}
          billingDetail={summary.billingDetail}
          promoCode={promoCode}
          payload={summary.payload}
        />
      </div>
    </div>
  );
}
