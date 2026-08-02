"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function OxidePluginInstaller({ orderId }: { orderId: string }) {
  const [pluginUrl, setPluginUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function installPlugin() {
    const url = pluginUrl.trim();
    if (!url) {
      setMessage("Paste a direct download URL for a .cs Oxide/uMod plugin first.");
      return;
    }

    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/servers/${orderId}/install-plugin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => null);
    setMessage(
      res.ok
        ? `Plugin installed to ${data?.path ?? "/oxide/plugins"}.`
        : (data?.error ?? "Plugin install failed"),
    );
    if (res.ok) setPluginUrl("");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="border-b border-white/[0.08] px-4 py-3">
          <h2 className="text-base font-semibold text-white">Oxide / uMod Plugin Installer</h2>
          <p className="mt-1 text-xs text-steel-faint">
            Paste a direct URL to a single `.cs` plugin file and HyperNode will place it in `/oxide/plugins`.
          </p>
        </div>
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Input
              value={pluginUrl}
              onChange={(event) => setPluginUrl(event.target.value)}
              placeholder="https://example.com/MyPlugin.cs"
              className="h-11 text-sm"
            />
            <p className="text-xs leading-5 text-steel-faint">
              This works best with raw GitHub, GitLab, or vendor-hosted direct file links. Zip packages are not supported here yet.
            </p>
          </div>
          <Button
            size="md"
            className="h-11 rounded-full px-5"
            disabled={busy}
            onClick={installPlugin}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Install Plugin
          </Button>
        </div>
      </section>

      {message && <p className="text-sm text-steel">{message}</p>}
    </div>
  );
}
