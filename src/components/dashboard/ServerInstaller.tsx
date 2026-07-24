"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, PlusSquare, Search } from "lucide-react";
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

function currentValue(variable?: Variable) {
  return (variable?.server_value || variable?.default_value || "").toLowerCase();
}

function hasTruthyValue(value: string) {
  return ["1", "true", "yes", "oxide", "carbon", "latest", "stable"].includes(value);
}

function detectProfile(vars: Variable[]): InstallProfile {
  const branchVar = vars.find((variable) => variableText(variable).includes("branch"));
  const frameworkVar = vars.find((variable) => variableText(variable).includes("framework"));
  const carbonVar = vars.find((variable) => variableText(variable).includes("carbon"));
  const oxideVar = vars.find((variable) => {
    const text = variableText(variable);
    return text.includes("oxide") || text.includes("umod");
  });

  const framework = currentValue(frameworkVar);
  const branch = currentValue(branchVar);
  const carbon = currentValue(carbonVar);
  const oxide = currentValue(oxideVar);

  if (framework === "carbon" || hasTruthyValue(carbon)) return "carbon";
  if (framework === "oxide" || hasTruthyValue(oxide)) return "oxide";
  if (branch.includes("staging")) return "staging";
  return "vanilla";
}

function availableProfiles(vars: Variable[]) {
  const hasBranch = vars.some((variable) => variableText(variable).includes("branch"));
  const hasFramework = vars.some((variable) => variableText(variable).includes("framework"));
  const hasOxide = vars.some((variable) => {
    const text = variableText(variable);
    return text.includes("oxide") || text.includes("umod");
  });
  const hasCarbon = vars.some((variable) => variableText(variable).includes("carbon"));

  const ids: InstallProfile[] = ["vanilla"];
  if (hasBranch) ids.push("staging");
  if (hasFramework || hasOxide) ids.push("oxide");
  if (hasFramework || hasCarbon) ids.push("carbon");
  return ids.map((id) => profileCatalog[id]);
}

export function ServerInstaller({ orderId }: { orderId: string }) {
  const [vars, setVars] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<InstallProfile | "steamcmd" | null>(null);
  const [query, setQuery] = useState("");
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

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <h2 className="text-xl font-medium text-white">Currently Installed</h2>
          <Button
            size="lg"
            className="rounded-full px-6"
            disabled={busy !== null}
            onClick={rerunSteamCmd}
          >
            {busy === "steamcmd" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusSquare className="h-4 w-4" />}
            Run SteamCMD
          </Button>
        </div>
        <div className="grid gap-5 px-5 py-5 md:grid-cols-[380px_1fr]">
          <div
            className="min-h-[200px] rounded-xl border border-white/10 bg-cover bg-center"
            style={{ backgroundImage: `url('${currentItem.image}')` }}
          />
          <div className="self-center">
            <p className="text-[2rem] font-medium text-white">{currentItem.title}</p>
            <p className="mt-2 text-[2rem] text-steel">{currentItem.subtitle}</p>
            <p className="mt-6 max-w-3xl text-2xl leading-relaxed text-steel">
              {currentItem.description}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-steel-faint">
              For autowipe-enabled eggs, reinstalling applies the selected runtime and any wipe flags currently set in startup variables.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#132b45]">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <h2 className="text-xl font-medium text-white">Catalog</h2>
        </div>
        <div className="border-b border-white/[0.08] px-5 py-5">
          <p className="mb-4 text-xl text-white">Filter the runtime catalog...</p>
          <div className="flex items-center overflow-hidden rounded-xl border border-white/20 bg-white/[0.06]">
            <div className="px-4 text-steel-faint">
              <Search className="h-6 w-6" />
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter available runtimes..."
              className="h-14 border-0 bg-transparent text-lg focus:border-0"
            />
          </div>
        </div>

        <div className="space-y-4 px-4 py-5">
          {filtered.map((profile) => {
            const installed = profile.id === currentProfile;
            return (
              <div key={profile.id}>
                <div className="mb-2 px-2 text-[1.8rem] text-white">
                  {profile.section} <span className="text-steel">{profile.title}</span>
                </div>
                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center">
                  <div
                    className={cn(
                      "h-28 w-32 shrink-0 rounded-xl border border-white/10 bg-cover bg-center",
                      (profile.id === "oxide" || profile.id === "carbon") && "bg-contain bg-no-repeat bg-white",
                    )}
                    style={{ backgroundImage: `url('${profile.image}')` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-medium text-white">{profile.title}</p>
                      {installed && <CheckCircle2 className="h-5 w-5 text-success" />}
                    </div>
                    <p className="mt-2 text-xl text-steel">{profile.subtitle}</p>
                    <p className="mt-3 line-clamp-2 text-xl leading-relaxed text-steel">
                      {profile.description}
                    </p>
                    {profile.badge && (
                      <div className="mt-3 inline-flex rounded-lg bg-white/10 px-3 py-1 text-sm text-steel">
                        {profile.badge}
                      </div>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="min-w-[122px] rounded-full px-6"
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

      {message && <p className="text-sm text-steel">{message}</p>}
      {loading && <p className="text-sm text-steel-faint">Loading installer details...</p>}
    </div>
  );
}
