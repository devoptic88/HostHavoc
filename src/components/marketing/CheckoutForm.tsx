"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

type RustCheckoutProfile = "vanilla" | "staging" | "oxide";

export function CheckoutForm({
  title,
  detail,
  locationName,
  price,
  payload,
  rustProfileOptions,
  requireMinecraftEula = false,
}: {
  title: string;
  detail: string;
  locationName?: string;
  price: number;
  payload: Record<string, unknown>;
  rustProfileOptions?: RustCheckoutProfile[];
  requireMinecraftEula?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        serverName: form.get("serverName"),
        rustProfile: form.get("rustProfile"),
        ...(requireMinecraftEula ? { minecraftEulaAccepted: eulaAccepted } : {}),
      }),
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
        {rustProfileOptions && rustProfileOptions.length > 0 && (
          <div>
            <Label htmlFor="rustProfile">Runtime</Label>
            <Select id="rustProfile" name="rustProfile" defaultValue={rustProfileOptions[0]}>
              {rustProfileOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "vanilla" ? "Vanilla" : option === "staging" ? "Staging" : "Oxide"}
                </option>
              ))}
            </Select>
          </div>
        )}
        {requireMinecraftEula && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <input
              type="checkbox"
              checked={eulaAccepted}
              onChange={(e) => setEulaAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-hyper-500"
            />
            <span className="text-xs leading-relaxed text-steel-dim">
              I agree to the{" "}
              <a
                href="https://aka.ms/MinecraftEULA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-hyper-300 underline"
              >
                Minecraft End User License Agreement
              </a>
              . Mojang requires the server operator to accept it before a server can run.
            </span>
          </label>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || (requireMinecraftEula && !eulaAccepted)}
        >
          {loading ? (
            "Redirecting…"
          ) : (
            <>
              <Rocket className="h-5 w-5" /> Continue to payment
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-steel-faint">
          <Lock className="h-3 w-3" /> Secure checkout powered by Paymenter ·
          Cancel anytime
        </p>
      </form>
    </div>
  );
}
