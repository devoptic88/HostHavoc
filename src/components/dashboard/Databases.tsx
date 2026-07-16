"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Db {
  id: string;
  name: string;
  username: string;
  host: { address: string; port: number };
  relationships?: { password?: { attributes: { password: string } } };
}

export function Databases({ orderId }: { orderId: string }) {
  const [dbs, setDbs] = useState<Db[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${orderId}/databases`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setDbs(data.data.map((d: { attributes: Db }) => d.attributes));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load databases");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    const name = prompt("Database name:");
    if (!name) return;
    const res = await fetch(`/api/servers/${orderId}/create-database`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) setError((await res.json()).error ?? "Failed to create database");
    load();
  }

  async function act(action: string, id: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    await fetch(`/api/servers/${orderId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Database className="h-4 w-4 text-hyper-400" /> Databases
        </span>
        <Button size="sm" onClick={create}>
          <Plus className="h-4 w-4" /> New database
        </Button>
      </div>
      {error && <p className="px-5 py-3 text-sm text-danger">{error}</p>}
      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-steel-faint">Loading…</p>
      ) : dbs.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-steel-faint">
          No databases yet. Many plugins and gamemodes (DarkRP, TShock, …) can
          use one — create it here.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {dbs.map((d) => (
            <li key={d.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{d.name}</p>
                  <p className="font-mono text-xs text-steel-faint">
                    {d.host.address}:{d.host.port} · user {d.username}
                  </p>
                  {d.relationships?.password && (
                    <p className="mt-1 font-mono text-xs text-steel-dim">
                      password:{" "}
                      {shown[d.id]
                        ? d.relationships.password.attributes.password
                        : "••••••••••••"}
                      <button
                        onClick={() => setShown((s) => ({ ...s, [d.id]: !s[d.id] }))}
                        className="ml-2 align-middle text-steel-faint hover:text-white"
                        aria-label="Toggle password visibility"
                      >
                        {shown[d.id] ? (
                          <EyeOff className="inline h-3.5 w-3.5" />
                        ) : (
                          <Eye className="inline h-3.5 w-3.5" />
                        )}
                      </button>
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Rotate password"
                    onClick={() => act("rotate-database", d.id)}
                  >
                    <KeyRound className="h-4 w-4 text-warning" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Delete"
                    onClick={() =>
                      act("delete-database", d.id, `Delete database "${d.name}" and all its data?`)
                    }
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
