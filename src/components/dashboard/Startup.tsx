"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Cloud,
  Clock3,
  Cog,
  Globe,
  Loader2,
  Lock,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface Variable {
  name: string;
  description: string;
  env_variable: string;
  server_value: string;
  default_value: string;
  is_editable: boolean;
}

const rustSections = [
  {
    id: "basic",
    title: "Basic",
    description: "Displayed identity, quick listing info, and player-facing server details.",
    icon: Cog,
    matchers: ["SERVER_NAME", "HOSTNAME", "DESCRIPTION", "URL", "HEADERIMAGE", "BANNER", "IDENTITY"],
  },
  {
    id: "world",
    title: "World",
    description: "Map generation, save identity, level, seed, and world size controls.",
    icon: Globe,
    matchers: ["LEVEL", "WORLD", "SEED", "MAP", "SAVE", "WORLD_SIZE"],
  },
  {
    id: "weather",
    title: "Weather",
    description: "Weather cycles, environment behaviors, and world ambience toggles.",
    icon: Cloud,
    matchers: ["WEATHER", "RAIN", "FOG", "WIND", "SNOW", "CLIMATE", "TIME"],
  },
  {
    id: "decay",
    title: "Decay",
    description: "Decay, upkeep, progression, and gameplay balance controls for wipes.",
    icon: Clock3,
    matchers: ["DECAY", "UPKEEP", "PVE", "PVP", "CRAFT", "GATHER", "XP", "PLAYER", "ANIMAL", "NPC", "BLUEPRINT", "WIPE"],
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "Connection details, RCON values, ports, and remaining startup variables.",
    icon: Shield,
    matchers: ["RCON", "PORT", "IP", "QUERY", "APP_PORT", "STEAM"],
  },
];

export function Startup({
  orderId,
  gameSlug,
}: {
  orderId: string;
  gameSlug?: string | null;
}) {
  const [vars, setVars] = useState<Variable[]>([]);
  const [startupCmd, setStartupCmd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("basic");

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

  const dirtyKeys = useMemo(
    () =>
      vars
        .filter((variable) => variable.is_editable)
        .filter(
          (variable) =>
            (edits[variable.env_variable] ?? variable.server_value ?? "") !==
            (variable.server_value ?? ""),
        )
        .map((variable) => variable.env_variable),
    [edits, vars],
  );

  async function saveAll() {
    if (dirtyKeys.length === 0) return;

    setSavingAll(true);
    setError("");
    setMessage("");

    const currentValues = new Map(vars.map((variable) => [variable.env_variable, variable.server_value ?? ""]));
    const updates = Object.fromEntries(
      dirtyKeys.map((key) => [key, edits[key] ?? currentValues.get(key) ?? ""]),
    );

    const res = await fetch(`/api/servers/${orderId}/save-startup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      setError(payload?.error ?? "Failed to save startup settings");
      setSavingAll(false);
      return;
    }

    setMessage(
      payload?.configPath
        ? `Saved startup settings and synced ${payload.configPath}.`
        : "Saved startup settings.",
    );
    setEdits({});
    setSavingAll(false);
    await load();
  }

  const isRust = gameSlug === "rust";
  const grouped = useMemo(() => groupVariables(vars, isRust), [vars, isRust]);
  const visibleSections = isRust ? grouped.filter((section) => section.id === activeTab) : grouped;

  useEffect(() => {
    if (!isRust || grouped.length === 0) return;
    if (!grouped.some((section) => section.id === activeTab)) {
      setActiveTab(grouped[0].id);
    }
  }, [activeTab, grouped, isRust]);

  return (
    <div className="space-y-5">
      {isRust && (
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1018]">
            <div className="border-b border-white/6 bg-[#10243a] px-5 py-3">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-hyper-300" />
                <h2 className="text-base font-semibold">Rust Official</h2>
              </div>
              <p className="mt-1 text-sm text-steel-dim">
                Core Rust runtime and startup profile for your live server.
              </p>
            </div>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
              <RustInstallCard title="Official" body="Your active production runtime for players and wipes." tone="active" />
              <RustInstallCard title="Staging" body="Keep staging values ready before a forced wipe or test cycle." />
              <RustInstallCard title="Oxide and Carbon" body="Plugin-ready configuration with modding variables grouped below." />
            </div>
          </div>

          <div className="glass rounded-[24px] p-5">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-base font-semibold">Wipe-Day Notes</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-steel-dim">
              <li>Use the settings below for map size, seed, server identity, and RCON values.</li>
              <li>For scheduled map or blueprint resets, pair these values with the server&apos;s automated tasks page.</li>
              <li>Locked variables come from the selected Rust egg and stay visible for reference.</li>
            </ul>
          </div>
        </div>
      )}

      {startupCmd && (
        <div className={cn("glass rounded-2xl px-5 py-4", isRust && "border-white/10 bg-[#091019]")}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-steel-faint">
            Startup command
          </p>
          <code className="block break-all font-mono text-xs text-steel">{startupCmd}</code>
        </div>
      )}

      <div className={cn("glass overflow-hidden rounded-2xl", isRust && "border-white/10 bg-[#091019]")}>
        <div className="border-b border-white/[0.06]">
          <div className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white">
            <SlidersHorizontal className="h-4 w-4 text-hyper-400" />
            {isRust ? "Game settings" : "Startup variables"}
          </div>
          {isRust && grouped.length > 0 && (
            <div className="flex flex-wrap gap-1 border-t border-white/[0.06] px-3 py-2">
              {grouped.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeTab;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={cn(
                      "ring-focus inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-hyper-500/15 text-hyper-300 ring-1 ring-inset ring-hyper-400/30"
                        : "text-steel hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {(error || message) && (
          <div className="space-y-2 px-5 py-3">
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {message ? <p className="text-sm text-success">{message}</p> : null}
          </div>
        )}

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">Loading...</p>
        ) : vars.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">
            This server exposes no editable variables.
          </p>
        ) : (
          <div className="space-y-5 px-5 py-5">
            {visibleSections.map((section) => (
              <section key={section.id} className="rounded-[22px] border border-white/[0.06] bg-white/[0.02]">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2 text-white">
                    <section.icon className="h-4 w-4 text-hyper-300" />
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-steel-dim">
                    {section.description}
                  </p>
                </div>

                <ul className="divide-y divide-white/[0.04]">
                  {section.variables.map((v) => (
                    <li key={v.env_variable} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_320px]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{v.name}</p>
                          <Badge tone={v.is_editable ? "blue" : "steel"}>
                            {v.is_editable ? "Editable" : "Locked"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-steel-faint">
                          {v.description || v.env_variable}
                        </p>
                        <p className="mt-2 font-mono text-[11px] text-steel-dim">
                          {v.env_variable}
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
                        {!v.is_editable ? (
                          <div className="flex h-full w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-steel-faint">
                            <Lock className="h-4 w-4" />
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-sm text-steel-dim">
                {dirtyKeys.length === 0
                  ? "No unsaved changes."
                  : `${dirtyKeys.length} change${dirtyKeys.length === 1 ? "" : "s"} ready to save across startup settings.`}
              </p>
              <Button
                onClick={saveAll}
                disabled={savingAll || dirtyKeys.length === 0}
                className="min-w-[170px]"
              >
                {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save all changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function groupVariables(vars: Variable[], isRust: boolean) {
  if (!isRust) {
    return [
      {
        id: "variables",
        title: "Startup Variables",
        description: "Editable environment values exposed by the installed egg.",
        icon: SlidersHorizontal,
        variables: vars,
      },
    ];
  }

  const buckets = rustSections.map((section) => ({ ...section, variables: [] as Variable[] }));
  const misc: Variable[] = [];

  for (const variable of vars) {
    const haystack = `${variable.name} ${variable.description} ${variable.env_variable}`.toUpperCase();
    const bucket = buckets.find((section) =>
      section.matchers.some((matcher) => haystack.includes(matcher)),
    );

    if (bucket) bucket.variables.push(variable);
    else misc.push(variable);
  }

  const ordered = buckets.filter((section) => section.variables.length > 0);
  const advanced = ordered.find((section) => section.id === "advanced");

  if (advanced && misc.length > 0) {
    advanced.variables.push(...misc);
    return ordered;
  }

  return [
    ...ordered,
    ...(misc.length > 0
      ? [
          {
            id: "advanced",
            title: "Advanced",
            description: "Remaining egg variables that do not fit the common Rust control groups.",
            icon: SlidersHorizontal,
            variables: misc,
          },
        ]
      : []),
  ];
}

function RustInstallCard({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: string;
  tone?: "default" | "active";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
        tone === "active" && "border-hyper-400/35 bg-hyper-500/10 shadow-glow-sm",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-white">{title}</p>
        <Badge tone={tone === "active" ? "green" : "steel"}>
          {tone === "active" ? "Installed" : "Available"}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-steel-dim">{body}</p>
    </div>
  );
}
