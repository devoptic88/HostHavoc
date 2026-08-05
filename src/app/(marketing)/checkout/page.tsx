import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { gameBySlug, priceForTier, resolveExistingGamePlan, tierLabel } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";
import { VPS_PLANS, DEDICATED_PLANS } from "@/content/plans";
import { getDisplayLocations } from "@/lib/locations";
import { CheckoutForm } from "@/components/marketing/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

type Search = {
  game?: string;
  units?: string;
  tier?: string;
  location?: string;
  product?: string;
  plan?: string;
  cancelled?: string;
};

function normalizeTier(value: string | undefined): PlanTier {
  return value?.toUpperCase() === "LITE" ? "LITE" : "PRO";
}

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

  let summary: {
    title: string;
    detail: string;
    price: number;
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
        title: "name" in plan ? `VPS — ${plan.name}` : `Dedicated — ${plan.cpu}`,
        detail:
          "name" in plan
            ? `${plan.ram} GB RAM · ${plan.vcpu} vCPU · ${plan.disk} GB NVMe`
            : `${plan.cores} · ${plan.ram} · ${plan.disk}`,
        price: plan.price,
        payload: { product: searchParams.product, plan: plan.id },
      };
    }
  } else if (searchParams.game) {
    const game = gameBySlug(searchParams.game);
    const units = Number(searchParams.units);
    if (game && searchParams.plan) {
      const { locations } = await getDisplayLocations();
      const loc = locations.find((l) => l.id === Number(searchParams.location));
      try {
        const plan = await resolveExistingGamePlan(game, searchParams.plan);
        summary = {
          title: `${game.name} Server`,
          detail: `${plan.name}${plan.slots ? ` · ${plan.slots} ${game.pricingUnit === "gb" ? "GB RAM" : "player slots"}` : ""} · ${tierLabel(plan.tier)}`,
          price: Number(plan.priceMonthly),
          payload: {
            game: game.slug,
            plan: plan.id,
            location: loc?.id ?? locations[0]?.id,
          },
          locationName: loc?.long ?? locations[0]?.long,
        };
      } catch {
        summary = null;
      }
    } else if (game && game.slotOptions.includes(units)) {
      const { locations } = await getDisplayLocations();
      const loc = locations.find((l) => l.id === Number(searchParams.location));
      const tier = normalizeTier(searchParams.tier);
      summary = {
        title: `${game.name} Server`,
        detail: `${units} ${game.pricingUnit === "gb" ? "GB RAM" : "player slots"} · ${tierLabel(tier)}`,
        price: priceForTier(game, units, tier),
        payload: {
          game: game.slug,
          units,
          tier,
          location: loc?.id ?? locations[0]?.id,
        },
        locationName: loc?.long ?? locations[0]?.long,
      };
    }
  }

  if (!summary) redirect("/games");

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="text-center font-display text-3xl font-extrabold italic text-white">
          Almost <span className="text-gradient-hyper">there</span>
        </h1>
        {searchParams.cancelled && (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-center text-sm text-warning">
            Payment was cancelled — your configuration is saved below.
          </p>
        )}
        <CheckoutForm
          title={summary.title}
          detail={summary.detail}
          locationName={summary.locationName}
          price={summary.price}
          payload={summary.payload}
          rustProfileOptions={summary.payload.game === "rust" ? ["vanilla", "staging", "oxide"] : undefined}
          requireMinecraftEula={summary.payload.game === "minecraft"}
        />
      </div>
    </div>
  );
}
