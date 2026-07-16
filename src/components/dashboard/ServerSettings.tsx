"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ServerSettings({
  orderId,
  currentName,
}: {
  orderId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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
        "Reinstall the server? Game files will be re-installed by the egg script. Your data may be modified — take a backup first.",
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/servers/${orderId}/reinstall`, { method: "POST" });
    setMsg(res.ok ? "Reinstall started." : (await res.json()).error ?? "Reinstall failed");
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Settings2 className="h-4 w-4 text-hyper-400" /> Server name
        </h2>
        <form onSubmit={rename} className="flex max-w-md gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          <Button type="submit" variant="secondary" disabled={busy}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </form>
      </div>

      <div className="glass rounded-2xl border-danger/20 p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" /> Danger zone
        </h2>
        <p className="mb-4 max-w-lg text-sm text-steel-dim">
          Reinstalling re-runs the game&apos;s install script. Configs may be reset
          — create a backup first.
        </p>
        <Button variant="danger" size="sm" disabled={busy} onClick={reinstall}>
          Reinstall server
        </Button>
      </div>

      {msg && <p className="text-sm text-steel">{msg}</p>}
    </div>
  );
}
