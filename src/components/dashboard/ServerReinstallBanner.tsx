"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type InstallProfile = "vanilla" | "oxide" | "carbon" | "staging";

export function ServerReinstallBanner({
  orderId,
  profile,
}: {
  orderId: string;
  profile: InstallProfile;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reinstall() {
    if (
      !confirm(
        "Reinstall the server now? This applies the saved Rust framework profile and may replace game files. Take a backup first.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/servers/${orderId}/install-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      setError(payload?.error ?? "Reinstall failed");
      setBusy(false);
      return;
    }

    setMessage("Reinstall started. Pterodactyl is now applying the saved Rust framework.");
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold">Server reinstall required</p>
          </div>
          <p className="mt-1 text-sm text-steel-dim">
            A Rust framework change to `{profile}` has been saved. Reinstall the server to apply it across game files.
          </p>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={reinstall}
          className="min-w-[180px]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          Reinstall server
        </Button>
      </div>
    </div>
  );
}
