"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Rocket, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { slugify } from "@/lib/utils";

export function ServerSettings({
  orderId,
  currentName,
  gameSlug,
}: {
  orderId: string;
  currentName: string;
  gameSlug?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const isRust = gameSlug === "rust";

  const hostname = useMemo(() => {
    const base = slugify(name) || "rust-server";
    return `${base}.hypernode.gg`;
  }, [name]);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/servers/${orderId}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setMsg(res.ok ? "Server renamed." : (await res.json()).error ?? "Rename failed");
    setBusy(false);
    router.refresh();
  }

  async function reinstall() {
    if (
      !confirm(
        "Reinstall the server? Game files will be re-installed by the egg script. Your data may be modified - take a backup first.",
      )
    ) {
      return;
    }

    setBusy(true);
    const res = await fetch(`/api/servers/${orderId}/reinstall`, { method: "POST" });
    setMsg(res.ok ? "Reinstall started." : (await res.json()).error ?? "Reinstall failed");
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      {isRust && (
        <div className="glass rounded-[24px] border-white/10 bg-[#091019] p-6">
          <div className="flex items-center gap-2 text-white">
            <Rocket className="h-4 w-4 text-hyper-300" />
            <h2 className="text-base font-semibold">Manage Instance</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-steel-dim">
            Update the public-facing identity for your Rust server and review the
            hostname players will recognize in your control panel.
          </p>
        </div>
      )}

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Settings2 className="h-4 w-4 text-hyper-400" />
          {isRust ? "Instance Name" : "Server Name"}
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-steel-dim">
          {isRust
            ? "This is the name shown in your header and throughout the Rust server manager."
            : "Rename the server shown in your dashboard and panel header."}
        </p>
        <form onSubmit={rename} className="flex max-w-xl gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          <Button type="submit" variant="secondary" disabled={busy}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </form>
      </div>

      {isRust && (
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold text-white">Hostname</h2>
          <p className="mb-4 max-w-2xl text-sm text-steel-dim">
            This mirrors the alias style shown in the reference manager. It is a
            display preview only and is derived from your current instance name.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
            <Input value={slugify(name) || "rust-server"} disabled />
            <Input value="hypernode.gg" disabled />
          </div>
          <p className="mt-3 font-mono text-xs text-steel-faint">{hostname}</p>
        </div>
      )}

      <div className="glass rounded-2xl border-danger/20 p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" /> Danger Zone
        </h2>
        <p className="mb-4 max-w-lg text-sm text-steel-dim">
          Reinstalling re-runs the game&apos;s install script. Configs may be reset,
          so create a backup first.
        </p>
        <Button variant="danger" size="sm" disabled={busy} onClick={reinstall}>
          Reinstall server
        </Button>
      </div>

      {msg && <p className="text-sm text-steel">{msg}</p>}
    </div>
  );
}
