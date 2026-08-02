"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Loader2, PlusSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
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

type InstallProfile = "vanilla" | "oxide" | "carbon" | "staging";

type ProfileOption = {
  id: InstallProfile;
  title: string;
  subtitle: string;
  description: string;
  section: string;
  badge?: string;
  image: string;
};

const profileCatalog: Record<InstallProfile, ProfileOption> = {
  vanilla: {
    id: "vanilla",
    title: "Vanilla",
    subtitle: "Default Rust runtime",
    description:
      "Runs stock Rust with the standard autowipe egg startup flow and no extra framework enabled.",
    section: "Rust Runtime",
    image: "/games/rust/capsule.jpg",
  },
  staging: {
    id: "staging",
    title: "Staging",
    subtitle: "Preview branch",
    description:
      "Uses the staging branch when the selected egg exposes a branch variable for pre-release testing.",
    section: "Rust Runtime",
    badge: "Legacy egg only",
    image: "/games/rust/capsule.jpg",
  },
  oxide: {
    id: "oxide",
    title: "Oxide",
    subtitle: "uMod/Oxide framework",
    description:
      "Enables the Oxide framework so plugin hooks and mod files are ready after reinstall.",
    section: "Modding",
    image: "/games/rust/logo.png",
  },
  carbon: {
    id: "carbon",
    title: "Carbon",
    subtitle: "Carbon framework",
    description:
      "Enables Carbon for servers that want a modern Rust modding stack on the autowipe egg.",
    section: "Modding",
    image: "/games/rust/logo.png",
  },
};

function variableText(variable: Variable) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toLowerCase();
}

function variableLabel(variable: Pick<Variable, "name" | "env_variable">) {
  return `${variable.name} ${variable.env_variable}`.toLowerCase();
}

function variableDescription(variable: Pick<Variable, "description">) {
  return `${variable.description}`.toLowerCase();
}

function currentValue(variable?: Variable) {
  return (variable?.server_value || variable?.default_value || "").toLowerCase();
}

function isFrameworkVariable(variable: Variable) {
  return variableText(variable).includes("framework");
}

function isBranchVariable(variable: Variable) {
  return variableText(variable).includes("branch");
}

function isOxideSignalVariable(variable: Variable) {
  if (isFrameworkVariable(variable) || isCarbonSignalVariable(variable)) return false;
  const label = variableLabel(variable);
  if (label.includes("oxide") || label.includes("umod")) return true;
  return variableDescription(variable).includes("oxide") || variableDescription(variable).includes("umod");
}

function isCarbonSignalVariable(variable: Variable) {
  if (isFrameworkVariable(variable) || isBranchVariable(variable)) return false;
  const label = variableLabel(variable);
  if (label.includes("carbon")) return true;
  if (label.includes("oxide") || label.includes("umod")) return false;
  return variableDescription(variable).includes("carbon");
}

function hasEnabledValue(value: string) {
  return ["1", "true", "yes", "on", "oxide", "carbon", "latest", "stable"].includes(value.trim().toLowerCase());
}

function detectProfile(vars: Variable[]): InstallProfile {
  const branchVar = vars.find(isBranchVariable);
  const frameworkVar = vars.find(isFrameworkVariable);

  const framework = currentValue(frameworkVar);
  const branch = currentValue(branchVar);

  if (branch.includes("staging")) return "staging";
  if (framework === "oxide") return "oxide";
  if (framework === "carbon") return "carbon";

  const oxideEnabled = vars.some((variable) => isOxideSignalVariable(variable) && hasEnabledValue(currentValue(variable)));
  const carbonEnabled = vars.some((variable) => isCarbonSignalVariable(variable) && hasEnabledValue(currentValue(variable)));

  if (oxideEnabled && !carbonEnabled) return "oxide";
  if (carbonEnabled && !oxideEnabled) return "carbon";
  if (oxideEnabled) return "oxide";
  if (carbonEnabled) return "carbon";

  return "vanilla";
}

function availableProfiles(vars: Variable[]) {
  const hasBranch = vars.some(isBranchVariable);
  const hasFramework = vars.some(isFrameworkVariable);
  const hasOxide = vars.some(isOxideSignalVariable);
  const hasCarbon = vars.some(isCarbonSignalVariable);

  const ids: InstallProfile[] = ["vanilla"];
  if (hasBranch) ids.push("staging");
  if (hasFramework || hasOxide) ids.push("oxide");
  if (hasFramework || hasCarbon) ids.push("carbon");
  return ids.map((id) => profileCatalog[id]);
}

export function ServerInstaller({ orderId }: { orderId: string }) {
  const [vars, setVars] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<InstallProfile | "steamcmd" | "plugin" | null>(null);
  const [query, setQuery] = useState("");
  const [pluginUrl, setPluginUrl] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/servers/${orderId}/startup`);
    if (res.ok) {
      const data = await res.json();
      setVars(data.data.map((item: { attributes: Variable }) => item.attributes));
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentProfile = useMemo(() => detectProfile(vars), [vars]);
  const profiles = useMemo(() => availableProfiles(vars), [vars]);
  const currentItem = profiles.find((profile) => profile.id === currentProfile) ?? profileCatalog[currentProfile];
  const filtered = profiles.filter((profile) =>
    `${profile.section} ${profile.title} ${profile.subtitle} ${profile.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  async function install(profile: InstallProfile) {
    setBusy(profile);
    setMessage("");
    const res = await fetch(`/api/servers/${orderId}/install-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    setMessage(
      res.ok
        ? "Install started. Pterodactyl is now reinstalling the server files for that profile."
        : ((await res.json().catch(() => null))?.error ?? "Install failed"),
    );
    setBusy(null);
    load();
  }

  async function rerunSteamCmd() {
    setBusy("steamcmd");
    setMessage("");
    const res = await fetch(`/api/servers/${orderId}/install-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: currentProfile }),
    });
    setMessage(
      res.ok
        ? "SteamCMD reinstall started for the current profile."
        : ((await res.json().catch(() => null))?.error ?? "SteamCMD reinstall failed"),
    );
    setBusy(null);
  }

  async function installPlugin() {
    const url = pluginUrl.trim();
    if (!url) {
      setMessage("Paste a direct download URL for a .cs Oxide/uMod plugin first.");
      return;
    }

    setBusy("plugin");
    setMessage("");
    const res = await fetch(`/api/servers/${orderId}/install-plugin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => null);
    setMessage(
      res.ok
        ? `Plugin installed to ${data?.path ?? "/oxide/plugins"}.`
        : (data?.error ?? "Plugin install failed"),
    );
    if (res.ok) setPluginUrl("");
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-white">Current Runtime</h2>
            <p className="mt-1 text-xs text-steel-faint">Reinstalling reapplies the selected Rust startup profile.</p>
          </div>
          <Button
            size="md"
            className="rounded-full px-5"
            disabled={busy !== null}
            onClick={rerunSteamCmd}
          >
            {busy === "steamcmd" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusSquare className="h-4 w-4" />}
            Run SteamCMD
          </Button>
        </div>
        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
          <div
            className={cn(
              "min-h-[150px] rounded-xl border border-white/10 bg-cover bg-center",
              (currentItem.id === "oxide" || currentItem.id === "carbon") && "bg-contain bg-no-repeat bg-white",
            )}
            style={{ backgroundImage: `url('${currentItem.image}')` }}
          />
          <div className="self-center">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-semibold text-white">{currentItem.title}</p>
              <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-steel">{currentItem.subtitle}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-steel">
              {currentItem.description}
            </p>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-steel-faint">
              For autowipe-enabled eggs, reinstalling applies the selected runtime and any wipe flags currently set in startup variables.
            </p>
          </div>
          <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-steel">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2">
              <span className="text-steel-faint">Section</span>
              <span className="font-medium text-white">{currentItem.section}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2">
              <span className="text-steel-faint">Available profiles</span>
              <span className="font-medium text-white">{profiles.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2">
              <span className="text-steel-faint">Plugin path</span>
              <span className="font-mono text-xs text-white">/oxide/plugins</span>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="border-b border-white/[0.08] px-4 py-3">
          <h2 className="text-base font-semibold text-white">Install Catalog</h2>
        </div>
        <div className="border-b border-white/[0.08] px-4 py-4">
          <p className="mb-3 text-sm text-steel">Filter available runtimes and modding frameworks.</p>
          <div className="flex items-center overflow-hidden rounded-xl border border-white/20 bg-white/[0.06]">
            <div className="px-3 text-steel-faint">
              <Search className="h-4 w-4" />
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter available runtimes..."
              className="h-11 border-0 bg-transparent text-sm focus:border-0"
            />
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          {filtered.map((profile) => {
            const installed = profile.id === currentProfile;
            return (
              <div key={profile.id}>
                <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-steel-faint">
                  <span>{profile.section}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 md:flex-row md:items-center">
                  <div
                    className={cn(
                      "h-20 w-24 shrink-0 rounded-xl border border-white/10 bg-cover bg-center",
                      (profile.id === "oxide" || profile.id === "carbon") && "bg-contain bg-no-repeat bg-white",
                    )}
                    style={{ backgroundImage: `url('${profile.image}')` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-white">{profile.title}</p>
                      {installed && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {profile.badge && (
                        <div className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-steel">
                          {profile.badge}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-steel">{profile.subtitle}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-steel">
                      {profile.description}
                    </p>
                  </div>
                  <Button
                    size="md"
                    className="min-w-[108px] rounded-full px-5"
                    disabled={busy !== null || installed}
                    variant={installed ? "secondary" : "primary"}
                    onClick={() => install(profile.id)}
                  >
                    {busy === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : installed ? (
                      "Installed"
                    ) : (
                      "Install"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="border-b border-white/[0.08] px-4 py-3">
          <h2 className="text-base font-semibold text-white">Oxide / uMod Plugin Installer</h2>
          <p className="mt-1 text-xs text-steel-faint">Paste a direct URL to a single `.cs` plugin file and HyperNode will place it in `/oxide/plugins`.</p>
        </div>
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Input
              value={pluginUrl}
              onChange={(event) => setPluginUrl(event.target.value)}
              placeholder="https://example.com/MyPlugin.cs"
              className="h-11 text-sm"
            />
            <p className="text-xs leading-5 text-steel-faint">
              This works best with raw GitHub, GitLab, or vendor-hosted direct file links. Zip packages are not supported here yet.
            </p>
          </div>
          <Button
            size="md"
            className="h-11 rounded-full px-5"
            disabled={busy !== null}
            onClick={installPlugin}
          >
            {busy === "plugin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Install Plugin
          </Button>
        </div>
      </section>

      {message && <p className="text-sm text-steel">{message}</p>}
      {loading && <p className="text-sm text-steel-faint">Loading installer details...</p>}
    </div>
  );
}
