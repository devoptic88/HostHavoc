"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ClientServer {
  sftp_details?: { ip: string; port: number };
  name?: string;
}

export function ServerSftp({ orderId }: { orderId: string }) {
  const [details, setDetails] = useState<ClientServer | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch(`/api/servers/${orderId}/details`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setDetails(data))
      .catch(() => {});
  }, [orderId]);

  const host = details?.sftp_details?.ip ?? "Loading...";
  const port = String(details?.sftp_details?.port ?? 2022);
  const user = useMemo(() => `server-${orderId.slice(0, 8)}`, [orderId]);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1400);
  }

  if (!details) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-steel-faint">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading SFTP details...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2 text-white">
          <KeyRound className="h-4 w-4 text-hyper-300" />
          <h2 className="text-base font-semibold">SFTP Access</h2>
        </div>
        <p className="max-w-2xl text-sm text-steel-dim">
          Connect with your SFTP client to upload worlds, mods, and large file sets directly into the
          server. Use the panel account password you sign in with.
        </p>
      </section>

      <section className="glass rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Host" value={host} copied={copied === "host"} onCopy={() => copy(host, "host")} />
          <Field label="Port" value={port} copied={copied === "port"} onCopy={() => copy(port, "port")} />
          <Field label="Username" value={user} copied={copied === "user"} onCopy={() => copy(user, "user")} />
          <Field
            label="Remote Path"
            value={`/home/container`}
            copied={copied === "path"}
            onCopy={() => copy("/home/container", "path")}
          />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-steel-faint">{label}</p>
      <div className="flex gap-2">
        <Input value={value} disabled className="font-mono" />
        <Button variant="secondary" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
