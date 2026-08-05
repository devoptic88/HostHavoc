"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Ban, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  OP_LEVELS,
  type BanEntry,
  type IpBanEntry,
  type McPlayerList,
  type OpEntry,
  type WhitelistEntry,
} from "@/lib/minecraftPlayers";

type Tab = "whitelist" | "ops" | "bans";

const TABS: { id: Tab; label: string }[] = [
  { id: "whitelist", label: "Allowlist" },
  { id: "ops", label: "Admins (OP)" },
  { id: "bans", label: "Banned" },
];

type Data = {
  whitelist: WhitelistEntry[];
  ops: OpEntry[];
  bans: BanEntry[];
  ipbans: IpBanEntry[];
  running: boolean;
};

export function MinecraftPlayers({ orderId }: { orderId: string }) {
  const [tab, setTab] = useState<Tab>("whitelist");
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [username, setUsername] = useState("");
  const [opLevel, setOpLevel] = useState("4");
  const [reason, setReason] = useState("");
  const [ip, setIp] = useState("");
  const [ipReason, setIpReason] = useState("");

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-players`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Failed to load players");
      setData(payload);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load players");
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function mutate(list: McPlayerList, op: "add" | "remove", extra: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list, op, ...extra }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Action failed");
      setData((prev) => (prev ? { ...prev, [list]: payload.entries } : prev));
      setMsg({ ok: true, text: payload.note ?? "Saved." });
      return true;
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Action failed" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="glass rounded-2xl border-warning/20 p-6">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Players unavailable</h2>
        </div>
        <p className="mt-2 max-w-xl text-sm text-steel-dim">{loadError}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setMsg(null);
              }}
              className={cn(
                "ring-focus rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                tab === item.id
                  ? "bg-hyper-500/15 text-hyper-300 ring-1 ring-inset ring-hyper-400/30"
                  : "text-steel-dim hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {item.label}
              {data && (
                <span className="ml-2 text-xs text-steel-faint">
                  {item.id === "whitelist"
                    ? data.whitelist.length
                    : item.id === "ops"
                      ? data.ops.length
                      : data.bans.length + data.ipbans.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-steel-dim">Loading players…</p>
        </div>
      ) : (
        <>
          {tab === "whitelist" && (
            <Section
              title="Allowlist"
              description="Only players on this list can join. Minecraft calls it the whitelist in config files — enable it under Game Settings → Advanced."
            >
              <AddRow
                busy={busy}
                placeholder="Minecraft username"
                value={username}
                onChange={setUsername}
                actionLabel="Add player"
                icon={<UserPlus className="h-3.5 w-3.5" />}
                onSubmit={async () => {
                  if (await mutate("whitelist", "add", { username })) setUsername("");
                }}
              />
              <PlayerTable
                empty="Nobody is on the allowlist yet."
                rows={data.whitelist.map((entry) => ({
                  key: entry.uuid,
                  name: entry.name,
                  meta: entry.uuid,
                  onRemove: () =>
                    mutate("whitelist", "remove", { username: entry.name, uuid: entry.uuid }),
                }))}
                busy={busy}
              />
            </Section>
          )}

          {tab === "ops" && (
            <Section
              title="Admins (OP)"
              description="Operators can run commands on your server. Level 4 grants full control including server management."
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Minecraft username"
                    disabled={busy}
                  />
                </div>
                <Select
                  value={opLevel}
                  onChange={(e) => setOpLevel(e.target.value)}
                  disabled={busy}
                  className="w-56"
                >
                  {OP_LEVELS.map((level) => (
                    <option key={level.level} value={level.level}>
                      {level.label} (level {level.level})
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || !username.trim()}
                  onClick={async () => {
                    if (await mutate("ops", "add", { username, level: Number(opLevel) })) {
                      setUsername("");
                    }
                  }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Make operator
                </Button>
              </div>
              <p className="text-xs text-steel-faint">
                {OP_LEVELS.find((l) => String(l.level) === opLevel)?.description}
              </p>
              <PlayerTable
                empty="No operators yet — add yourself to run commands in-game."
                rows={data.ops.map((entry) => ({
                  key: entry.uuid,
                  name: entry.name,
                  badge: `${OP_LEVELS.find((l) => l.level === entry.level)?.label ?? "Level"} ${entry.level}`,
                  meta: entry.uuid,
                  onRemove: () =>
                    mutate("ops", "remove", { username: entry.name, uuid: entry.uuid }),
                }))}
                busy={busy}
              />
            </Section>
          )}

          {tab === "bans" && (
            <>
              <Section
                title="Banned players"
                description="Banned players are refused at login with the reason you set."
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem] flex-1">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Minecraft username"
                      disabled={busy}
                    />
                  </div>
                  <div className="min-w-[12rem] flex-1">
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (optional)"
                      disabled={busy}
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy || !username.trim()}
                    onClick={async () => {
                      if (await mutate("bans", "add", { username, reason })) {
                        setUsername("");
                        setReason("");
                      }
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" /> Ban player
                  </Button>
                </div>
                <PlayerTable
                  empty="No banned players."
                  rows={data.bans.map((entry) => ({
                    key: entry.uuid,
                    name: entry.name,
                    meta: entry.reason,
                    onRemove: () =>
                      mutate("bans", "remove", { username: entry.name, uuid: entry.uuid }),
                    removeLabel: "Unban",
                  }))}
                  busy={busy}
                />
              </Section>

              <Section
                title="Banned IPs"
                description="Blocks connections from an address regardless of which account is used."
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[10rem] flex-1">
                    <Input
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="203.0.113.10"
                      disabled={busy}
                    />
                  </div>
                  <div className="min-w-[12rem] flex-1">
                    <Input
                      value={ipReason}
                      onChange={(e) => setIpReason(e.target.value)}
                      placeholder="Reason (optional)"
                      disabled={busy}
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy || !ip.trim()}
                    onClick={async () => {
                      if (await mutate("ipbans", "add", { ip, reason: ipReason })) {
                        setIp("");
                        setIpReason("");
                      }
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" /> Ban IP
                  </Button>
                </div>
                <PlayerTable
                  empty="No banned IP addresses."
                  rows={data.ipbans.map((entry) => ({
                    key: entry.ip,
                    name: entry.ip,
                    meta: entry.reason,
                    onRemove: () => mutate("ipbans", "remove", { ip: entry.ip }),
                    removeLabel: "Unban",
                  }))}
                  busy={busy}
                />
              </Section>
            </>
          )}

          {msg && (
            <p className={cn("text-sm", msg.ok ? "text-steel" : "text-danger")}>{msg.text}</p>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-0.5 max-w-2xl text-xs text-steel-faint">{description}</p>
      </div>
      {children}
    </div>
  );
}

function AddRow({
  value,
  onChange,
  onSubmit,
  placeholder,
  actionLabel,
  icon,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  actionLabel: string;
  icon: React.ReactNode;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[12rem] flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit();
          }}
        />
      </div>
      <Button variant="secondary" size="sm" disabled={busy || !value.trim()} onClick={onSubmit}>
        {icon} {actionLabel}
      </Button>
    </div>
  );
}

function PlayerTable({
  rows,
  empty,
  busy,
}: {
  rows: {
    key: string;
    name: string;
    badge?: string;
    meta?: string;
    onRemove: () => void;
    removeLabel?: string;
  }[];
  empty: string;
  busy: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-steel-faint">{empty}</p>;
  }
  return (
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06]">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3 px-4 py-3">
          {/* Public skin renderer keyed by UUID. Left as a plain <img> rather
              than next/image so we don't have to whitelist a third-party host
              in next.config for what is purely decorative. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc-heads.net/avatar/${encodeURIComponent(row.key)}/32`}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-md bg-white/[0.06]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-white">{row.name}</p>
              {row.badge && (
                <span className="rounded-md bg-hyper-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-hyper-300">
                  {row.badge}
                </span>
              )}
            </div>
            {row.meta && <p className="truncate font-mono text-[11px] text-steel-faint">{row.meta}</p>}
          </div>
          <Button variant="ghost" size="sm" disabled={busy} onClick={row.onRemove}>
            <Trash2 className="h-3.5 w-3.5" /> {row.removeLabel ?? "Remove"}
          </Button>
        </div>
      ))}
    </div>
  );
}
