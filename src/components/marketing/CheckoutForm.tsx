"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function CheckoutForm({
  title,
  detail,
  locationName,
  price,
  payload,
}: {
  title: string;
  detail: string;
  locationName?: string;
  price: number;
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
      setError(data?.error ?? "Checkout failed — please try again.");
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
    <div className="glass-strong mt-8 rounded-2xl p-7 shadow-card">
      <div className="border-b border-white/[0.06] pb-5">
        <h2 className="font-display text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-steel-dim">{detail}</p>
        {locationName && (
          <p className="mt-1 text-sm text-steel-dim">Location: {locationName}</p>
        )}
        <p className="mt-4 font-display text-3xl font-extrabold text-gradient-hyper">
          ${price.toFixed(2)}
          <span className="text-sm font-semibold text-steel-faint">/month</span>
        </p>
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
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            "Redirecting…"
          ) : (
            <>
              <Rocket className="h-5 w-5" /> Continue to payment
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-steel-faint">
          <Lock className="h-3 w-3" /> Secure checkout powered by Stripe ·
          Cancel anytime
        </p>
      </form>
    </div>
  );
}
