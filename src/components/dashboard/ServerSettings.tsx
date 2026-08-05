"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  Compass,
  Copy,
  EyeOff,
  Globe,
  Rocket,
  Save,
  Settings2,
  Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { AutoSaveToggleRow } from "@/components/dashboard/AutoSaveToggleRow";
import { cn, slugify } from "@/lib/utils";

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function ServerSettings({
  orderId,
  currentName,
  gameSlug,
  subdomain,
  domain,
  webRedirect: initialWebRedirect,
  streamerMode: initialStreamerMode,
  timezone: initialTimezone,
}: {
  orderId: string;
  currentName: string;
  gameSlug?: string | null;
  subdomain?: string | null;
  domain?: string | null;
  webRedirect?: boolean;
  streamerMode?: boolean;
  timezone?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const isRust = gameSlug === "rust";

  const [sub, setSub] = useState(subdomain ?? "");
  const [savedSub, setSavedSub] = useState(subdomain ?? "");
  const [subMsg, setSubMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [subBusy, setSubBusy] = useState(false);

  const hostname = useMemo(() => {
    const base = slugify(name) || "rust-server";
    return `${base}.hypernode.gg`;
  }, [name]);

  const [timezone, setTimezone] = useState(initialTimezone ?? "");
  const [savedTimezone, setSavedTimezone] = useState(initialTimezone ?? "");
  const [tzBusy, setTzBusy] = useState(false);
  const [tzMsg, setTzMsg] = useState<string | null>(null);

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return FALLBACK_TIMEZONES;
    }
  }, []);

  async function saveWebRedirect(next: boolean) {
    const res = await fetch(`/api/servers/${orderId}/manage-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webRedirect: next }),
    });
    if (!res.ok) {
      throw new Error((await res.json().catch(() => null))?.error ?? "Failed to update");
    }
  }

  async function saveStreamerMode(next: boolean) {
    const res = await fetch(`/api/servers/${orderId}/manage-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamerMode: next }),
    });
    if (!res.ok) {
      throw new Error((await res.json().catch(() => null))?.error ?? "Failed to update");
    }
    router.refresh();
  }

  function detectTimezone() {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      /* Intl unsupported in this environment */
    }
  }

  async function saveTimezone() {
    setTzBusy(true);
    setTzMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/manage-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: timezone || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save timezone");
      setSavedTimezone(timezone);
      setTzMsg("Timezone saved.");
    } catch (err) {
      setTzMsg(err instanceof Error ? err.message : "Failed to save timezone");
    } finally {
      setTzBusy(false);
    }
  }

  async function saveSubdomain(e: React.FormEvent) {
    e.preventDefault();
    setSubBusy(true);
    setSubMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/subdomain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: sub.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not update the address");
      setSavedSub(data.subdomain);
      setSub(data.subdomain);
      setSubMsg({
        ok: true,
        text: `Address updated to ${data.hostname}. DNS changes can take a minute to spread.`,
      });
      router.refresh();
    } catch (err) {
      setSubMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Could not update the address",
      });
    } finally {
      setSubBusy(false);
    }
  }

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
          Instance Name
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

      {domain && (
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <Globe className="h-4 w-4 text-hyper-400" />
            Hostname
          </h2>
          <p className="mb-4 max-w-2xl text-sm text-steel-dim">
            The address players connect with. It points at your server on whichever port it runs,
            so nobody has to type a port number.
          </p>

          {savedSub ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="font-mono text-sm text-white">
                {savedSub}.{domain}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`${savedSub}.${domain}`);
                  setSubMsg({ ok: true, text: "Address copied." });
                }}
                className="ring-focus rounded-lg px-2 py-1 text-xs text-steel-dim transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Copy className="mr-1 inline h-3 w-3" /> Copy
              </button>
            </div>
          ) : (
            <p className="mb-4 text-sm text-steel-faint">
              No address assigned yet — pick one below.
            </p>
          )}

          <form onSubmit={saveSubdomain} className="flex max-w-xl flex-wrap items-center gap-2">
            <div className="flex min-w-[14rem] flex-1 items-center gap-1.5">
              <Input
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                placeholder="my-server"
                maxLength={63}
                pattern="[A-Za-z0-9\-]+"
                required
              />
              <span className="shrink-0 font-mono text-sm text-steel-faint">.{domain}</span>
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={subBusy || !sub.trim() || sub.trim().toLowerCase() === savedSub}
            >
              <Save className="h-4 w-4" /> Save
            </Button>
          </form>
          {subMsg && (
            <p className={cn("mt-3 text-sm", subMsg.ok ? "text-steel" : "text-danger")}>
              {subMsg.text}
            </p>
          )}
        </div>
      )}

      {isRust && !domain && (
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

      <div className="glass rounded-2xl p-6">
        <AutoSaveToggleRow
          icon={<Waypoints className="h-4 w-4 text-hyper-400" />}
          label="Web Redirect"
          description="This redirects any traffic to your server over the web, such as via a web-browser, to our website. This will be configurable to your own domain or website in the future. Changes may take a few minutes to go into effect."
          checked={initialWebRedirect ?? false}
          onSave={saveWebRedirect}
        />
      </div>

      <div className="glass rounded-2xl p-6">
        <AutoSaveToggleRow
          icon={<EyeOff className="h-4 w-4 text-hyper-400" />}
          label="Streamer Mode"
          description="Enabling this feature will hide the server IP from your overview, dashboard, and header. It will also hide all client IPs from your console, enabling you to stream or record the server control panel if you wish."
          checked={initialStreamerMode ?? false}
          onSave={saveStreamerMode}
        />
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Clock className="h-4 w-4 text-hyper-400" />
          Server Timezone
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-steel-dim">
          This controls the timezone that your gameserver will run in. Some games require a
          specific timezone for in-game events. Note that this will NOT affect Automated Tasks
          or any other HyperPanel features.
        </p>
        <div className="flex max-w-2xl flex-wrap items-center gap-2">
          <Select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="min-w-[14rem] flex-1"
          >
            <option value="">Node default</option>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
          <Button type="button" variant="secondary" onClick={detectTimezone}>
            <Compass className="h-4 w-4" /> Detect My Timezone
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={tzBusy || timezone === savedTimezone}
            onClick={saveTimezone}
          >
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
        {tzMsg && <p className="mt-3 text-sm text-steel">{tzMsg}</p>}
      </div>

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
