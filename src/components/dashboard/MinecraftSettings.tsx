"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { MC_FIELDS, MC_TABS, type McField, type McTab } from "@/lib/minecraftSettings";

/**
 * Nodecraft-style tabbed settings forms backed by server.properties.
 * Field state is `string` (the value) or `null` ("Use setting" off — the key
 * is removed from the file so the game default applies).
 */

type FieldState = Record<string, string | null>;

function initialStateFrom(values: Record<string, string>): FieldState {
  const state: FieldState = {};
  for (const field of MC_FIELDS) {
    if (field.key in values) {
      state[field.key] = values[field.key];
    } else {
      state[field.key] = field.optional ? null : (field.default ?? "");
    }
  }
  return state;
}

type UiTab = McTab | "java";

const UI_TABS: { id: UiTab; label: string }[] = [
  MC_TABS[0],
  { id: "java", label: "Java" },
  ...MC_TABS.slice(1),
];

export function MinecraftSettings({
  orderId,
  serverName,
}: {
  orderId: string;
  serverName: string;
}) {
  const [tab, setTab] = useState<UiTab>("basic");
  const [saved, setSaved] = useState<FieldState | null>(null);
  const [draft, setDraft] = useState<FieldState>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restartNeeded, setRestartNeeded] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/game-settings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load settings");
      const state = initialStateFrom(data.values ?? {});
      setSaved(state);
      setDraft(state);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load settings");
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const tabFields = useMemo(
    () => (tab === "java" ? [] : MC_FIELDS.filter((field) => field.tab === tab)),
    [tab],
  );

  const dirtyKeys = useMemo(() => {
    if (!saved) return [];
    return tabFields
      .map((field) => field.key)
      .filter((key) => draft[key] !== saved[key]);
  }, [draft, saved, tabFields]);

  function setValue(key: string, value: string | null) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setMsg(null);
  }

  function resetTab() {
    if (!saved) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const field of tabFields) next[field.key] = saved[field.key];
      return next;
    });
    setMsg(null);
  }

  async function submitTab() {
    if (!saved || dirtyKeys.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const updates: FieldState = {};
      for (const key of dirtyKeys) updates[key] = draft[key];
      const res = await fetch(`/api/servers/${orderId}/game-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save settings");
      setSaved((prev) => ({ ...(prev ?? {}), ...updates }));
      setRestartNeeded(true);
      setMsg("Settings saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  async function restart() {
    setBusy(true);
    try {
      await fetch(`/api/servers/${orderId}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: "restart" }),
      });
      setRestartNeeded(false);
      setMsg("Restart signal sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {restartNeeded && (
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border-warning/25 p-4">
          <p className="text-sm text-steel">
            <span className="font-semibold text-warning">Restart required</span> — changes take
            effect after the server restarts.
          </p>
          <Button variant="secondary" size="sm" disabled={busy} onClick={restart}>
            <RotateCw className="h-3.5 w-3.5" /> Restart now
          </Button>
        </div>
      )}

      <div className="glass rounded-2xl p-2">
        <div className="flex flex-wrap gap-1">
          {UI_TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "ring-focus rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                tab === item.id
                  ? "bg-hyper-500/15 text-hyper-300 ring-1 ring-inset ring-hyper-400/30"
                  : "text-steel-dim hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "java" ? (
        <JavaSettings orderId={orderId} onSaved={() => setRestartNeeded(true)} />
      ) : loadError ? (
        <div className="glass rounded-2xl border-warning/20 p-6">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Settings unavailable</h2>
          </div>
          <p className="mt-2 max-w-xl text-sm text-steel-dim">{loadError}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
            Retry
          </Button>
        </div>
      ) : (
      <div className="glass rounded-2xl p-6">
        {!saved ? (
          <p className="text-sm text-steel-dim">Loading settings…</p>
        ) : (
          <div className="space-y-6">
            {tab === "basic" && (
              <ServerNameField orderId={orderId} initialName={serverName} />
            )}
            {tabFields.map((field) => (
              <div key={field.key} className="space-y-6">
                <SettingRow
                  field={field}
                  value={draft[field.key] ?? null}
                  onChange={(value) => setValue(field.key, value)}
                />
                {/* Sits directly under MOTD so the pairing is obvious. */}
                {field.key === "motd" && (
                  <MotdPreview
                    name={serverName}
                    motd={draft["motd"] ?? ""}
                    maxPlayers={draft["max-players"] ?? "20"}
                  />
                )}
              </div>
            ))}

            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-5">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || dirtyKeys.length === 0}
                onClick={submitTab}
              >
                <Save className="h-3.5 w-3.5" /> Submit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || dirtyKeys.length === 0}
                onClick={resetTab}
              >
                <Undo2 className="h-3.5 w-3.5" /> Reset
              </Button>
              {dirtyKeys.length > 0 && (
                <span className="text-xs text-steel-faint">
                  {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}
                </span>
              )}
              {msg && <span className="ml-auto text-sm text-steel">{msg}</span>}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/**
 * The server's own name. Minecraft has no `server-name` property — the label
 * in a player's multiplayer list is whatever they typed when adding the server
 * — so this is the instance name, shared with Manage Instance.
 */
function ServerNameField({
  orderId,
  initialName,
}: {
  orderId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Rename failed");
      setSaved(name);
      setMsg("Server renamed.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-white">Server Name</p>
      <p className="mt-0.5 max-w-xl text-xs text-steel-faint">
        The name of this server in your dashboard and control panel. Players see the name they
        saved you under plus your MOTD, so put anything you want them to read in the MOTD below.
      </p>
      <div className="mt-2 flex max-w-xl items-center gap-2">
        <Input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && name !== saved) save();
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !name.trim() || name === saved}
          onClick={save}
        >
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>
      {msg && <p className="mt-2 text-xs text-steel-dim">{msg}</p>}
    </div>
  );
}

/** Minecraft legacy colour/format codes, as used in MOTDs. */
const MC_COLORS: Record<string, string> = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
  "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
  "8": "#555555", "9": "#5555FF", a: "#55FF55", b: "#55FFFF",
  c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
};

function renderMotdLine(line: string, keyPrefix: string) {
  // Split on § codes, carrying colour and bold forward like the game does.
  const parts = line.split(/(§[0-9a-fk-orA-FK-OR])/);
  let color = "#AAAAAA";
  let bold = false;
  const nodes: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    if (/^§[0-9a-fk-orA-FK-OR]$/.test(part)) {
      const code = part[1].toLowerCase();
      if (code in MC_COLORS) {
        color = MC_COLORS[code];
        bold = false;
      } else if (code === "l") bold = true;
      else if (code === "r") {
        color = "#AAAAAA";
        bold = false;
      }
      return;
    }
    if (!part) return;
    nodes.push(
      <span key={`${keyPrefix}-${index}`} style={{ color, fontWeight: bold ? 700 : 400 }}>
        {part}
      </span>,
    );
  });

  return nodes.length > 0 ? nodes : <span style={{ color }}>&nbsp;</span>;
}

function MotdPreview({
  name,
  motd,
  maxPlayers,
}: {
  name: string;
  motd: string;
  maxPlayers: string;
}) {
  // MOTDs may carry a literal \n for a second line.
  const lines = motd.replace(/\\n/g, "\n").split("\n").slice(0, 2);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-steel-faint">
        MOTD Preview
      </p>
      <div className="mt-2 flex max-w-xl items-start gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-3">
        <div className="h-10 w-10 shrink-0 rounded bg-[#2f2f2f]" />
        <div className="min-w-0 flex-1 font-mono text-[13px] leading-snug">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold text-white">{name}</span>
            <span className="shrink-0 text-[11px] text-[#AAAAAA]">0/{maxPlayers || "20"}</span>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="truncate">
              {renderMotdLine(line, `motd-${index}`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JavaSettings({ orderId, onSaved }: { orderId: string; onSaved: () => void }) {
  const [data, setData] = useState<{
    current: string;
    images: { label: string; image: string }[];
    jarVariable: string | null;
    currentJar: string | null;
    jars: string[];
  } | null>(null);
  const [choice, setChoice] = useState("");
  const [jarChoice, setJarChoice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-java`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Failed to load Java settings");
      setData(payload);
      setChoice(payload.current);
      setJarChoice(payload.currentJar ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Java settings");
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: { image?: string; jar?: string }, successText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-java`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Failed to save");
      setData((prev) =>
        prev
          ? {
              ...prev,
              ...(patch.image ? { current: patch.image } : {}),
              ...(patch.jar ? { currentJar: patch.jar } : {}),
            }
          : prev,
      );
      setMsg(successText);
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="glass rounded-2xl border-warning/20 p-6">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Java settings unavailable</h2>
        </div>
        <p className="mt-2 max-w-xl text-sm text-steel-dim">{error}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      {!data ? (
        <p className="text-sm text-steel-dim">Loading Java settings…</p>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-white">Java Version</p>
            <p className="mt-0.5 max-w-xl text-xs text-steel-faint">
              Changes the container image (and Java runtime) the server runs on. Only images
              allowed by this server&apos;s egg are listed.
            </p>
            <div className="mt-2 flex max-w-xl items-center gap-2">
              <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
                {data.images.map((entry) => (
                  <option key={entry.image} value={entry.image}>
                    {entry.label} ({entry.image})
                  </option>
                ))}
                {!data.images.some((entry) => entry.image === data.current) && (
                  <option value={data.current}>Current ({data.current})</option>
                )}
              </Select>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || choice === data.current}
                onClick={() => save({ image: choice }, "Java runtime updated.")}
              >
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
          {data.jarVariable && (
            <div>
              <p className="text-sm font-semibold text-white">Server Jar</p>
              <p className="mt-0.5 max-w-xl text-xs text-steel-faint">
                The jar this server boots. Only jars present in your server files are listed —
                upload one in the File Manager and it will appear here.
              </p>
              <div className="mt-2 flex max-w-xl items-center gap-2">
                <Select
                  value={jarChoice}
                  onChange={(e) => setJarChoice(e.target.value)}
                  disabled={data.jars.length === 0}
                >
                  {data.jars.length === 0 ? (
                    <option value="">No jars found in the server root</option>
                  ) : (
                    data.jars.map((jar) => (
                      <option key={jar} value={jar}>
                        {jar}
                      </option>
                    ))
                  )}
                  {data.currentJar && !data.jars.includes(data.currentJar) && (
                    <option value={data.currentJar}>{data.currentJar} (missing)</option>
                  )}
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || !jarChoice || jarChoice === data.currentJar}
                  onClick={() => save({ jar: jarChoice }, "Server jar updated.")}
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
              {data.currentJar && !data.jars.includes(data.currentJar) && (
                <p className="mt-2 text-xs text-warning">
                  The configured jar ({data.currentJar}) is not in your server files — the server
                  will fail to start until you pick one that exists.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-steel-faint">
            Server memory comes from your plan and is applied as a container limit — the JVM
            sizes its heap from that automatically, so there is no RAM setting here.
          </p>
          {msg && <p className="text-sm text-steel">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  field,
  value,
  onChange,
}: {
  field: McField;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const inUse = value !== null;
  const effective = value ?? field.default ?? "";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{field.label}</p>
          {field.description && (
            <p className="mt-0.5 max-w-xl text-xs text-steel-faint">{field.description}</p>
          )}
        </div>
        {field.optional && !field.readOnly && (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-steel-dim">
            Use setting
            <Toggle
              checked={inUse}
              onChange={(checked) => onChange(checked ? (field.default ?? "") : null)}
            />
          </label>
        )}
      </div>
      <div className={cn("mt-2", !inUse && field.optional && "pointer-events-none opacity-40")}>
        <SettingInput field={field} value={effective} onChange={onChange} disabled={!inUse} />
      </div>
    </div>
  );
}

function SettingInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: McField;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  if (field.readOnly) {
    return <Input value={value || "—"} disabled className="max-w-xs" />;
  }

  switch (field.type) {
    case "toggle":
      return (
        <Toggle
          checked={value === "true"}
          disabled={disabled}
          onChange={(checked) => onChange(checked ? "true" : "false")}
        />
      );
    case "segmented":
      return (
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {field.options?.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "ring-focus rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                value === option.value
                  ? "bg-hyper-500/20 text-hyper-300"
                  : "text-steel-dim hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    case "select":
      return (
        <Select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-md"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case "slider": {
      const num = Number(value);
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      return (
        <div className="flex max-w-md items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            value={Number.isFinite(num) ? num : min}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-1.5 flex-1 accent-hyper-400"
          />
          <Input
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 text-center"
          />
        </div>
      );
    }
    case "int":
      return (
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[10rem]"
          inputMode="numeric"
        />
      );
    default:
      return (
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-md"
        />
      );
  }
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "ring-focus relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-hyper-500" : "bg-white/15",
        disabled && "opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
