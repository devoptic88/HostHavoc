"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCw, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  SPIGOT_FIELDS,
  SPIGOT_SECTIONS,
  type SpigotField,
  type SpigotFile,
} from "@/lib/minecraftSpigot";

type Values = Record<SpigotFile, Record<string, string> | null>;

const keyOf = (field: SpigotField) => `${field.file}:${field.path}`;

export function MinecraftSpigotSettings({ orderId }: { orderId: string }) {
  const [values, setValues] = useState<Values | null>(null);
  const [supported, setSupported] = useState(true);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [restartNeeded, setRestartNeeded] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/servers/${orderId}/mc-spigot`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load Spigot settings");
      setValues(data.values);
      setSupported(data.supported);

      const flat: Record<string, string> = {};
      for (const field of SPIGOT_FIELDS) {
        const fileValues = data.values?.[field.file];
        if (fileValues && field.path in fileValues) {
          flat[keyOf(field)] = String(fileValues[field.path]);
        }
      }
      setSaved(flat);
      setDraft(flat);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load Spigot settings");
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Only fields the server's own config actually contains. */
  const available = useMemo(
    () => SPIGOT_FIELDS.filter((field) => keyOf(field) in saved),
    [saved],
  );

  const dirtyKeys = useMemo(
    () => available.map(keyOf).filter((key) => draft[key] !== saved[key]),
    [available, draft, saved],
  );

  async function submit() {
    if (dirtyKeys.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const updates: Record<string, Record<string, string>> = {};
      for (const field of available) {
        const key = keyOf(field);
        if (draft[key] === saved[key]) continue;
        updates[field.file] ??= {};
        updates[field.file][field.path] = draft[key];
      }
      const res = await fetch(`/api/servers/${orderId}/mc-spigot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      setSaved((prev) => ({ ...prev, ...Object.fromEntries(dirtyKeys.map((k) => [k, draft[k]])) }));
      setRestartNeeded(true);
      setMsg({ ok: true, text: `Saved to ${data.written.join(" and ")}.` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="glass rounded-2xl border-warning/20 p-6">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Spigot settings unavailable</h2>
        </div>
        <p className="mt-2 max-w-xl text-sm text-steel-dim">{loadError}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  if (values && !supported) {
    return (
      <div className="glass rounded-2xl border-warning/25 p-6">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Not a Spigot-based server</h2>
        </div>
        <p className="mt-2 max-w-xl text-sm text-steel-dim">
          This server has no <span className="font-mono text-steel">spigot.yml</span> or{" "}
          <span className="font-mono text-steel">bukkit.yml</span>, so these settings don&apos;t
          apply. Install Paper, Purpur, or Spigot from the One-Click Installer to use them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {restartNeeded && (
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border-warning/25 p-4">
          <p className="text-sm text-steel">
            <span className="font-semibold text-warning">Restart required</span> — these files are
            read when the server starts.
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={async () => {
              await fetch(`/api/servers/${orderId}/power`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signal: "restart" }),
              });
              setRestartNeeded(false);
            }}
          >
            <RotateCw className="h-3.5 w-3.5" /> Restart now
          </Button>
        </div>
      )}

      {!values ? (
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-steel-dim">Loading settings…</p>
        </div>
      ) : (
        <>
          {SPIGOT_SECTIONS.map((section) => {
            const fields = available.filter((field) => field.section === section.id);
            if (fields.length === 0) return null;
            return (
              <div key={section.id} className="glass space-y-5 rounded-2xl p-6">
                <div>
                  <h2 className="text-sm font-semibold text-white">{section.label}</h2>
                  <p className="mt-0.5 max-w-2xl text-xs text-steel-faint">{section.description}</p>
                </div>
                {fields.map((field) => {
                  const key = keyOf(field);
                  return (
                    <div key={key}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{field.label}</p>
                          {field.description && (
                            <p className="mt-0.5 max-w-xl text-xs text-steel-faint">
                              {field.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-steel-faint">
                          {field.file}.yml
                        </span>
                      </div>
                      <div className="mt-2">
                        {field.type === "toggle" ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={draft[key] === "true"}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                [key]: prev[key] === "true" ? "false" : "true",
                              }))
                            }
                            className={cn(
                              "ring-focus relative h-5 w-9 shrink-0 rounded-full transition-colors",
                              draft[key] === "true" ? "bg-hyper-500" : "bg-white/15",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                                draft[key] === "true" ? "translate-x-[18px]" : "translate-x-0.5",
                              )}
                            />
                          </button>
                        ) : (
                          <Input
                            value={draft[key] ?? ""}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className={field.type === "text" ? "max-w-xl" : "max-w-[12rem]"}
                            inputMode={field.type === "text" ? undefined : "decimal"}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="glass flex items-center gap-2 rounded-2xl p-4">
            <Button variant="secondary" size="sm" disabled={busy || dirtyKeys.length === 0} onClick={submit}>
              <Save className="h-3.5 w-3.5" /> Submit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || dirtyKeys.length === 0}
              onClick={() => setDraft(saved)}
            >
              <Undo2 className="h-3.5 w-3.5" /> Reset
            </Button>
            {dirtyKeys.length > 0 && (
              <span className="text-xs text-steel-faint">
                {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}
              </span>
            )}
            {msg && (
              <span className={cn("ml-auto text-sm", msg.ok ? "text-steel" : "text-danger")}>
                {msg.text}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
