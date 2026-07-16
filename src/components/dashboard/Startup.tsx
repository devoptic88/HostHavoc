"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Variable {
  name: string;
  description: string;
  env_variable: string;
  server_value: string;
  default_value: string;
  is_editable: boolean;
}

export function Startup({ orderId }: { orderId: string }) {
  const [vars, setVars] = useState<Variable[]>([]);
  const [startupCmd, setStartupCmd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${orderId}/startup`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setVars(data.data.map((d: { attributes: Variable }) => d.attributes));
      setStartupCmd(data.meta?.startup_command ?? "");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load startup config");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(v: Variable) {
    const value = edits[v.env_variable] ?? v.server_value;
    setSavingKey(v.env_variable);
    const res = await fetch(`/api/servers/${orderId}/update-variable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: v.env_variable, value }),
    });
    if (!res.ok) setError((await res.json()).error ?? "Failed to save variable");
    setSavingKey(null);
    load();
  }

  return (
    <div className="space-y-5">
      {startupCmd && (
        <div className="glass rounded-2xl px-5 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-steel-faint">
            Startup command
          </p>
          <code className="block break-all font-mono text-xs text-steel">{startupCmd}</code>
        </div>
      )}

      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3 text-sm font-semibold text-white">
          <SlidersHorizontal className="h-4 w-4 text-hyper-400" /> Startup variables
        </div>
        {error && <p className="px-5 py-3 text-sm text-danger">{error}</p>}
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">Loading…</p>
        ) : vars.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">
            This server exposes no editable variables.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {vars.map((v) => (
              <li key={v.env_variable} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_280px]">
                <div>
                  <p className="text-sm font-semibold text-white">{v.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-steel-faint">
                    {v.description || v.env_variable}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={edits[v.env_variable] ?? v.server_value ?? ""}
                    disabled={!v.is_editable}
                    onChange={(e) =>
                      setEdits((s) => ({ ...s, [v.env_variable]: e.target.value }))
                    }
                  />
                  {v.is_editable && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-auto"
                      disabled={savingKey === v.env_variable}
                      onClick={() => save(v)}
                    >
                      {savingKey === v.env_variable ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
