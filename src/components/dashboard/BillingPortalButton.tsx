"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BillingPortalButton() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.redirect) {
      window.location.href = data.redirect;
      return;
    }
    setError(data?.error ?? "Could not open the billing portal.");
    setLoading(false);
  }

  return (
    <div className="text-right">
      <Button size="sm" onClick={open} disabled={loading}>
        <CreditCard className="h-4 w-4" />
        {loading ? "Opening…" : "Manage billing"}
      </Button>
      {error && <p className="mt-2 max-w-xs text-xs text-danger">{error}</p>}
    </div>
  );
}
