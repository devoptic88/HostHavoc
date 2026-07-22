"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Lock,
  Rocket,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function CheckoutForm({
  title,
  detail,
  locationName,
  price,
  billingLabel,
  billingDetail,
  promoCode,
  payload,
}: {
  title: string;
  detail: string;
  locationName?: string;
  price: number;
  billingLabel: string;
  billingDetail: string;
  promoCode?: string;
  payload: Record<string, unknown>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, serverName: form.get("serverName") }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.redirect) {
      setError(data?.error ?? "Checkout failed. Please try again.");
      setLoading(false);
      return;
    }
    if (data.redirect.startsWith("/")) {
      router.push(data.redirect);
    } else {
      window.location.href = data.redirect;
    }
  }

  return (
    <div className="surface-panel mt-8 rounded-[28px] p-7 shadow-card">
      <div className="grid gap-5 border-b border-white/[0.06] pb-5 sm:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-steel-dim">{detail}</p>
          {locationName ? <p className="mt-1 text-sm text-steel-dim">Region: {locationName}</p> : null}
          {promoCode ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-success">
              <BadgeCheck className="h-3.5 w-3.5" />
              Promo queued: {promoCode}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-steel-faint">
            Billing cadence
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{billingLabel}</p>
          <p className="mt-1 text-xs text-steel">{billingDetail}</p>
          <p className="mt-4 font-display text-3xl font-extrabold text-gradient-hyper">
            ${price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ProofLine icon={Timer} text="Transparent staged provisioning" />
        <ProofLine icon={ShieldCheck} text="Stripe-secured billing flow" />
        <ProofLine icon={BadgeCheck} text="Launches into server overview" />
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div>
          <Label htmlFor="serverName">Server name</Label>
          <Input
            id="serverName"
            name="serverName"
            required
            maxLength={60}
            placeholder="e.g. Midnight Raiders"
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            "Redirecting..."
          ) : (
            <>
              <Rocket className="h-5 w-5" /> Continue to secure checkout
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-steel-faint">
          <Lock className="h-3 w-3" /> Secure checkout powered by Stripe. Cancel anytime.
        </p>
      </form>
    </div>
  );
}

function ProofLine({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-steel">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-hyper-300" />
        <span>{text}</span>
      </div>
    </div>
  );
}
