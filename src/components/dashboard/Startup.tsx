"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Cloud,
  Clock3,
  Cog,
  Dice5,
  Globe,
  Loader2,
  Lock,
  Minus,
  Plus,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface Variable {
  name: string;
  description: string;
  env_variable: string;
  server_value: string;
  default_value: string;
  is_editable: boolean;
  rules: string;
}

type RustRuntimeProfile = "vanilla" | "staging" | "oxide" | "carbon";

function isRustManagedPortVariable(variable: Variable, isRust: boolean) {
  if (!isRust) return false;
  const text = `${variable.name} ${variable.description} ${variable.env_variable}`.toUpperCase();
  return (
    (text.includes("QUERY") && text.includes("PORT")) ||
    (text.includes("RCON") && text.includes("PORT")) ||
    (text.includes("APP") && text.includes("PORT")) ||
    ((text.includes("SERVER") || text.includes("GAME")) && text.includes("PORT"))
  );
}

function isRustFrameworkVariable(variable: Variable, isRust: boolean) {
  if (!isRust) return false;
  const text = `${variable.name} ${variable.description} ${variable.env_variable}`.toUpperCase();
  return text.includes("FRAMEWORK");
}

function isRustBranchVariable(variable: Variable, isRust: boolean) {
  if (!isRust) return false;
  const text = `${variable.name} ${variable.description} ${variable.env_variable}`.toUpperCase();
  return text.includes("BRANCH");
}

function variableValue(variable: Variable) {
  return (variable.server_value || variable.default_value || "vanilla").trim().toLowerCase();
}

function variableText(variable: Variable) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toUpperCase();
}

function compactVariableText(variable: Variable) {
  return variableText(variable).replace(/[^A-Z0-9]/g, "");
}

function isRustMaxPlayersVariable(variable: Variable, isRust: boolean) {
  if (!isRust) return false;
  const text = variableText(variable);
  const compact = compactVariableText(variable);
  return compact.includes("MAXPLAYERS") || text.includes("MAX PLAYERS");
}

function rustBasicFieldMeta(variable: Variable) {
  const text = variableText(variable);
  const env = variable.env_variable.toUpperCase();

  if (env === "DESCRIPTION" || text.includes("DESCRIPTION")) {
    return {
      order: 1,
      label: "Server Description",
      helper: "Appears under Server Name in listing",
    };
  }

  if (
    env === "HOSTNAME" ||
    text.includes("SERVER NAME") ||
    text.includes("SERVER TITLE") ||
    text.includes("HOSTNAME")
  ) {
    return {
      order: 0,
      label: "Server Name",
      helper: "Displayed in the server list & when someone is joining the server",
    };
  }

  if (
    env === "HEADERIMAGE" ||
    env === "SERVER_IMG" ||
    text.includes("HEADERIMAGE") ||
    text.includes("HEADER IMAGE") ||
    text.includes("SERVER IMAGE")
  ) {
    return {
      order: 2,
      label: "Server Image URL",
      helper: "512 x 256 image displayed when joining the server",
    };
  }

  if (isRustMaxPlayersVariable(variable, true)) {
    return {
      order: 3,
      label: "Max Players",
      helper: "Limit the number of players in the server - more players may require more resources",
    };
  }

  if (env === "URL" || (text.includes("URL") && !text.includes("MAP") && !text.includes("HEADER"))) {
    return {
      order: 4,
      label: "Webpage URL",
      helper: "A button to this website will be displayed in the server list",
    };
  }

  return {
    order: 100,
    label: variable.name,
    helper: variable.description || variable.env_variable,
  };
}

function maxPlayersBounds(rawValue: string) {
  const parsed = Number.parseInt(rawValue, 10);
  const safeValue = Number.isFinite(parsed) ? parsed : 50;
  const clampedValue = Math.min(500, Math.max(1, safeValue));

  return { min: 1, max: 500, value: clampedValue };
}

function ruleNumber(rule: string, key: "min" | "max") {
  const match = rule.match(new RegExp(`${key}:(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number.parseFloat(match[1]) : null;
}

function currentFieldValue(variable: Variable, edits: Record<string, string>) {
  return edits[variable.env_variable] ?? variable.server_value ?? variable.default_value ?? "";
}

function parseNumericField(variable: Variable, edits: Record<string, string>) {
  const rawValue = currentFieldValue(variable, edits);
  const parsed = Number.parseFloat(rawValue);
  const ruleText = variable.rules || "";
  const min = ruleNumber(ruleText, "min");
  const max = ruleNumber(ruleText, "max");
  const integerLike = /integer|numeric/.test(ruleText) && !/regex|string/.test(ruleText);
  const step = integerLike ? 1 : 0.1;
  const fallback = Number.parseFloat(variable.default_value || "0");
  const safeValue = Number.isFinite(parsed) ? parsed : Number.isFinite(fallback) ? fallback : 0;
  const clampedMin = min ?? 0;
  const clampedMax = max ?? Math.max(clampedMin + step, safeValue || 10);
  const clampedValue = Math.min(clampedMax, Math.max(clampedMin, safeValue));

  return {
    min: clampedMin,
    max: clampedMax,
    step,
    value: clampedValue,
    display: integerLike ? String(Math.round(clampedValue)) : String(clampedValue),
    integerLike,
  };
}

function isBooleanVariable(variable: Variable) {
  return /boolean|bool|true|false|0|1|yes|no/i.test(variable.rules || "");
}

function booleanOptions(variable: Variable) {
  const sample = currentFieldValue(variable, {});
  if (/^(true|false)$/i.test(sample)) return { on: "true", off: "false" };
  if (/^(yes|no)$/i.test(sample)) return { on: "yes", off: "no" };
  return { on: "1", off: "0" };
}

function isTruthyValue(value: string) {
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function worldFieldMeta(variable: Variable) {
  const text = variableText(variable);
  const compact = compactVariableText(variable);
  const env = variable.env_variable.toUpperCase();

  const definitions = [
    {
      match: () => text.includes("IDENTITY") || text.includes("DATA FOLDER"),
      label: "Data Folder",
      helper: "Identity folder to store map and player data in the /server folder",
      kind: "text",
      order: 100,
      group: "top",
    },
    {
      match: () =>
        (text.includes("LEVEL") || compact.includes("MAPTYPE")) &&
        !text.includes("URL") &&
        !compact.includes("CUSTOMMAP"),
      label: "World Generator",
      helper: "The map to start on",
      kind: "select",
      order: 1,
      group: "top",
    },
    {
      match: () => compact.includes("SEED"),
      label: "World Seed",
      helper: "The seed used to generate the procedural level",
      kind: "seed",
      order: 2,
      group: "top",
    },
    {
      match: () =>
        env === "MAP_URL" ||
        compact.includes("LEVELURL") ||
        compact.includes("CUSTOMMAP") ||
        (text.includes("MAP") && text.includes("URL")),
      label: "Custom Map",
      helper: "Overwrites the map with the one from the direct download URL. Invalid URLs will cause the server to crash.",
      kind: "text",
      order: 0,
      group: "top",
    },
    {
      match: () => compact.includes("WORLDSIZE"),
      label: "World Size",
      helper: "Defines the size of the map generated (Min 1000, Max 8000). Default 4500",
      kind: "slider",
      order: 3,
      group: "top",
    },
    {
      match: () => compact.includes("RADIATION"),
      label: "Radiation",
      helper: "Enable or Disable radiation across the entire world",
      kind: "toggle",
      order: 4,
      group: "top",
    },
    {
      match: () => compact.includes("SAVEINTERVAL"),
      label: "Save Interval",
      helper: "Amount of seconds between automatic saves",
      kind: "slider",
      order: 5,
      group: "top",
    },
    {
      match: () => compact.includes("ANIMAL") && compact.includes("POPULATION"),
      label: "Animal Population",
      helper: "Settings for the number of animals that spawn",
      kind: "slider",
      order: 100,
      group: "animals",
    },
    {
      match: () =>
        env === "HORSE_POPULATION" ||
        (compact.includes("RIDEABLE") && compact.includes("HORSE") && compact.includes("POPULATION")),
      label: "Rideable Horse Population",
      helper: "Number of rideable horses per square km",
      kind: "slider",
      order: 0,
      group: "animals",
    },
    {
      match: () => compact.includes("WILD") && compact.includes("HORSE") && compact.includes("POPULATION"),
      label: "Wild Horse Population",
      helper: "Number of wild horses per square km (normally disabled)",
      kind: "slider",
      order: 100,
      group: "animals",
    },
    {
      match: () => compact.includes("WOLF") && compact.includes("POPULATION"),
      label: "Wolf Population",
      helper: "Number of wolves per square km",
      kind: "slider",
      order: 1,
      group: "animals",
    },
    {
      match: () => compact.includes("CHICKEN") && compact.includes("POPULATION"),
      label: "Chicken Population",
      helper: "Number of chickens per square km",
      kind: "slider",
      order: 2,
      group: "animals",
    },
    {
      match: () => compact.includes("BOAR") && compact.includes("POPULATION"),
      label: "Boar Population",
      helper: "Number of boars per square km",
      kind: "slider",
      order: 3,
      group: "animals",
    },
    {
      match: () => compact.includes("STAG") && compact.includes("POPULATION"),
      label: "Stag Population",
      helper: "Number of stags per square km",
      kind: "slider",
      order: 4,
      group: "animals",
    },
    {
      match: () => compact.includes("BEAR") && compact.includes("POPULATION"),
      label: "Bear Population",
      helper: "Number of bears per square km",
      kind: "slider",
      order: 5,
      group: "animals",
    },
    {
      match: () => compact.includes("VEHICLE") && compact.includes("POPULATION"),
      label: "Vehicle Population",
      helper: "Settings for the number of vehicles that spawn",
      kind: "slider",
      order: 100,
      group: "vehicles",
    },
    {
      match: () => compact.includes("HOTAIRBALLOON") && compact.includes("POPULATION"),
      label: "Hot Air Balloon Population",
      helper: "Number of hot air balloons per square km",
      kind: "slider",
      order: 0,
      group: "vehicles",
    },
    {
      match: () =>
        compact.includes("MINI") &&
        compact.includes("COPTER") &&
        compact.includes("POPULATION"),
      label: "Mini Copter Population",
      helper: "Number of mini copters per square km (normally disabled)",
      kind: "slider",
      order: 1,
      group: "vehicles",
    },
    {
      match: () => compact.includes("MODULAR") && compact.includes("CAR") && compact.includes("POPULATION"),
      label: "Modular Car Population",
      helper: "Number of modular cars per square km",
      kind: "slider",
      order: 2,
      group: "vehicles",
    },
    {
      match: () => compact.includes("MOTOR") && compact.includes("ROWBOAT") && compact.includes("POPULATION"),
      label: "Motor Rowboat Population",
      helper: "Number of motor rowboats per square km",
      kind: "slider",
      order: 3,
      group: "vehicles",
    },
    {
      match: () => compact.includes("RHIB") && compact.includes("POPULATION"),
      label: "RHIB Population",
      helper: "Number of rigged hulled inflatable boats per square km (normally disabled)",
      kind: "slider",
      order: 4,
      group: "vehicles",
    },
    {
      match: () => compact.includes("SCRAP") && compact.includes("TRANSPORT") && compact.includes("HELICOPTER") && compact.includes("POPULATION"),
      label: "Scrap Transport Helicopter Population",
      helper: "Number of scrap transport helicopters per square km (normally disabled)",
      kind: "slider",
      order: 5,
      group: "vehicles",
    },
  ] as const;

  const found = definitions.find((definition) => definition.match());
  return {
    label: found?.label ?? variable.name,
    order: found?.order ?? 100,
    group: found?.group ?? "top",
    kind:
      found?.kind ??
      (isBooleanVariable(variable) ? "toggle" : /population|size|interval/i.test(text) ? "slider" : "text"),
    helper: found?.helper ?? (variable.description || variable.env_variable),
  };
}

function boundedNumericField(
  numeric: ReturnType<typeof parseNumericField>,
  min: number,
  max: number,
) {
  const value = Math.min(max, Math.max(min, numeric.value));

  return {
    ...numeric,
    min,
    max,
    value,
    display: numeric.integerLike ? String(Math.round(value)) : String(value),
  };
}

function worldNumericField(
  variable: Variable,
  edits: Record<string, string>,
  meta: ReturnType<typeof worldFieldMeta>,
) {
  const numeric = parseNumericField(variable, edits);

  if (meta.label === "Save Interval") {
    return boundedNumericField(numeric, 0, 1500);
  }

  if (meta.group === "animals" || meta.group === "vehicles") {
    return boundedNumericField(numeric, 0, 10);
  }

  return numeric;
}

function randomRustSeed() {
  return String(Math.floor(Math.random() * 2147483647));
}

function rangeFillStyle(value: number, min: number, max: number) {
  const percent = max <= min ? 0 : ((value - min) / (max - min)) * 100;
  const safePercent = Math.min(100, Math.max(0, percent));

  return {
    background: `linear-gradient(to right, #18aee6 0%, #18aee6 ${safePercent}%, #343a40 ${safePercent}%, #343a40 100%)`,
  };
}

function weatherFieldMeta(variable: Variable) {
  const text = variableText(variable);

  const definitions = [
    { match: () => text.includes("RAIN") && text.includes("WETNESS"), label: "Rain Wetness", order: 0 },
    { match: () => text.includes("SNOW") && text.includes("WETNESS"), label: "Snow Wetness", order: 1 },
    { match: () => text.includes("FOG") && text.includes("CHANCE"), label: "Fog Chance", order: 2 },
    { match: () => text.includes("OVERCAST") && text.includes("CHANCE"), label: "Overcast Chance", order: 3 },
    { match: () => text.includes("STORM") && text.includes("CHANCE"), label: "Storm Chance", order: 4 },
    { match: () => text.includes("RAIN") && text.includes("CHANCE"), label: "Rain Chance", order: 5 },
    { match: () => text.includes("WIND") && text.includes("CHANCE"), label: "Wind Chance", order: 6 },
    { match: () => text.includes("THUNDER") && text.includes("CHANCE"), label: "Thunder Chance", order: 7 },
    { match: () => text.includes("DUST") && text.includes("CHANCE"), label: "Dust Chance", order: 8 },
    { match: () => text.includes("TEMPERATURE"), label: "Temperature", order: 50 },
    { match: () => text.includes("HUMIDITY"), label: "Humidity", order: 51 },
    { match: () => text.includes("CLOUD") && text.includes("COLOR"), label: "Cloud Coloring", order: 52 },
    { match: () => text.includes("CLOUD") && text.includes("ATTENUATION"), label: "Cloud Attenuation", order: 53 },
    { match: () => text.includes("CLOUD") && text.includes("SCATTER"), label: "Cloud Scattering", order: 54 },
    { match: () => text.includes("CLOUD") && text.includes("BRIGHT"), label: "Cloud Brightness", order: 55 },
    { match: () => text.includes("CLOUD"), label: "Cloud Coverage", order: 56 },
    { match: () => text.includes("WIND"), label: "Wind", order: 57 },
    { match: () => text.includes("FOG"), label: "Fog", order: 58 },
    { match: () => text.includes("RAIN"), label: "Rain", order: 59 },
    { match: () => text.includes("THUNDER"), label: "Thunder and Lightning", order: 60 },
    { match: () => text.includes("DUST"), label: "Dust", order: 61 },
  ] as const;

  const found = definitions.find((definition) => definition.match());
  const kind = isBooleanVariable(variable)
    ? "toggle"
    : /chance|wetness|humidity|temperature|cloud|wind|fog|rain|storm|snow|dust|thunder/i.test(text)
      ? "slider"
      : "text";

  return {
    label: found?.label ?? variable.name,
    order: found?.order ?? 100,
    kind,
    helper: variable.description || variable.env_variable,
  };
}

function decayFieldMeta(variable: Variable) {
  const text = variableText(variable);

  const definitions = [
    { match: () => text.includes("DECAY SCALE"), label: "Decay Scale", order: 0, group: null },
    { match: () => text.includes("DECAY DELAY"), label: "Decay Delay", order: 10, group: "Delay for Building Decay" },
    { match: () => text.includes("UPKEEP"), label: variable.name, order: 20, group: "Upkeep" },
    { match: () => text.includes("BUILDING") && text.includes("DECAY"), label: variable.name, order: 30, group: "Building Decay" },
    { match: () => text.includes("TC") || text.includes("TOOL CUPBOARD"), label: variable.name, order: 40, group: "Tool Cupboard" },
    { match: () => text.includes("PVE") || text.includes("PVP"), label: variable.name, order: 50, group: "Gameplay" },
    { match: () => text.includes("GATHER") || text.includes("XP") || text.includes("CRAFT"), label: variable.name, order: 60, group: "Gameplay" },
  ] as const;

  const found = definitions.find((definition) => definition.match());
  const kind = isBooleanVariable(variable)
    ? "toggle"
    : /decay|upkeep|hours|time|delay|scale|multiplier|radius|cost|damage|rate/i.test(text)
      ? "slider"
      : "text";

  return {
    label: found?.label ?? variable.name,
    order: found?.order ?? 100,
    group: found?.group ?? null,
    kind,
    helper: variable.description || variable.env_variable,
  };
}

function advancedFieldMeta(variable: Variable) {
  const text = variableText(variable);

  const definitions = [
    { match: () => text.includes("TICKRATE"), label: "Tickrate", order: 0, kind: "slider", group: null },
    { match: () => text.includes("RCON") && text.includes("PASSWORD"), label: "RCON Password", order: 1, kind: "password", group: null },
    { match: () => text.includes("RCON") && text.includes("WEB"), label: "Enable Web RCON", order: 2, kind: "toggle", group: null },
    { match: () => text.includes("SECURE BOOT") || text.includes("TPM"), label: "Secure Boot Enforcement", order: 3, kind: "toggle", group: null },
    { match: () => text.includes("CONVAR") || text.includes("ARGUMENT"), label: "ConVars", order: 50, kind: "textarea", group: "Custom Server Arguments" },
  ] as const;

  const found = definitions.find((definition) => definition.match());
  const kind = found?.kind ??
    (isBooleanVariable(variable)
      ? "toggle"
      : /tick|port|rate|query|rcon|players|saveinterval|interval/i.test(text)
        ? "slider"
        : "text");

  return {
    label: found?.label ?? variable.name,
    order: found?.order ?? 100,
    group: found?.group ?? null,
    kind,
    helper: variable.description || variable.env_variable,
  };
}

function parseRuntimeOptions() {
  return ["vanilla", "staging", "oxide", "carbon"] satisfies RustRuntimeProfile[];
}

function runtimeProfileFromVariables(
  frameworkVariable: Variable | null,
  branchVariable: Variable | null,
  edits: Record<string, string> = {},
) {
  const branch = branchVariable ? (edits[branchVariable.env_variable] ?? variableValue(branchVariable)).trim().toLowerCase() : "public";
  const framework = frameworkVariable ? (edits[frameworkVariable.env_variable] ?? variableValue(frameworkVariable)).trim().toLowerCase() : "vanilla";
  if (branch.includes("staging")) return "staging";
  if (framework === "oxide") return "oxide";
  if (framework === "carbon") return "carbon";
  return "vanilla";
}

function runtimeLabel(profile: RustRuntimeProfile) {
  return profile.charAt(0).toUpperCase() + profile.slice(1);
}

function rustSectionIdForVariable(variable: Variable) {
  const text = variableText(variable);
  const compact = compactVariableText(variable);
  const env = variable.env_variable.toUpperCase();

  if (env === "URL" || (text.includes("URL") && !text.includes("MAP") && !text.includes("LEVEL"))) {
    return "basic";
  }

  if (
    env === "MAP_URL" ||
    text.includes("LEVELURL") ||
    text.includes("CUSTOM MAP") ||
    (text.includes("MAP") && text.includes("URL"))
  ) {
    return "world";
  }

  if (
    compact.includes("WORLDSIZE") ||
    compact.includes("SAVEINTERVAL") ||
    compact.includes("RADIATION") ||
    compact.includes("HORSEPOPULATION") ||
    compact.includes("WOLFPOPULATION") ||
    compact.includes("CHICKENPOPULATION") ||
    compact.includes("BOARPOPULATION") ||
    compact.includes("STAGPOPULATION") ||
    compact.includes("BEARPOPULATION") ||
    compact.includes("HOTAIRBALLOONPOPULATION") ||
    compact.includes("MINICOPTERPOPULATION") ||
    compact.includes("MODULARCARPOPULATION") ||
    compact.includes("MOTORROWBOATPOPULATION") ||
    compact.includes("RHIBPOPULATION") ||
    compact.includes("SCRAPTRANSPORTHELICOPTERPOPULATION")
  ) {
    return "world";
  }

  return null;
}

const rustSections = [
  {
    id: "basic",
    title: "Basic",
    description: "Displayed identity, quick listing info, and player-facing server details.",
    icon: Cog,
    matchers: ["SERVER_NAME", "HOSTNAME", "DESCRIPTION", "HEADERIMAGE", "SERVER_IMG", "BANNER", "MAXPLAYERS", "MAX PLAYERS"],
  },
  {
    id: "world",
    title: "World",
    description: "Map generation, save identity, level, seed, and world size controls.",
    icon: Globe,
    matchers: ["LEVEL", "WORLD", "SEED", "MAP", "SAVE", "RADIATION", "POPULATION", "WORLD_SIZE", "IDENTITY", "LEVELURL", "CUSTOM MAP", "MAP_URL"],
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
    matchers: ["DECAY", "UPKEEP", "PVE", "PVP", "CRAFT", "GATHER", "XP", "PLAYER", "ANIMAL", "NPC", "BLUEPRINT", "WIPE", "REGEN", "REMOVE_FILES"],
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
  const isRust = gameSlug === "rust";
  const router = useRouter();

  const frameworkVariable = useMemo(
    () => vars.find((variable) => isRustFrameworkVariable(variable, isRust)) ?? null,
    [isRust, vars],
  );
  const branchVariable = useMemo(
    () => vars.find((variable) => isRustBranchVariable(variable, isRust)) ?? null,
    [isRust, vars],
  );
  const runtimeVariable = frameworkVariable ?? branchVariable;
  const hiddenRuntimeEnvVars = useMemo(
    () =>
      new Set(
        [frameworkVariable, branchVariable]
          .filter((variable): variable is Variable => Boolean(variable))
          .filter((variable) => variable.env_variable !== runtimeVariable?.env_variable)
          .map((variable) => variable.env_variable),
      ),
    [branchVariable, frameworkVariable, runtimeVariable],
  );
  const installedRuntime = runtimeProfileFromVariables(frameworkVariable, branchVariable);
  const selectedRuntime = runtimeVariable && edits[runtimeVariable.env_variable] !== undefined
    ? (edits[runtimeVariable.env_variable] as RustRuntimeProfile)
    : runtimeProfileFromVariables(frameworkVariable, branchVariable, edits);

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
        .filter(
          (variable) =>
            variable.is_editable &&
            !isRustManagedPortVariable(variable, isRust) &&
            !hiddenRuntimeEnvVars.has(variable.env_variable),
        )
        .filter(
          (variable) =>
            isRust && runtimeVariable && variable.env_variable === runtimeVariable.env_variable
              ? selectedRuntime !== installedRuntime
              : (edits[variable.env_variable] ?? variable.server_value ?? "") !==
                (variable.server_value ?? ""),
        )
        .map((variable) => variable.env_variable),
    [edits, hiddenRuntimeEnvVars, installedRuntime, isRust, runtimeVariable, selectedRuntime, vars],
  );

  async function saveAll() {
    if (dirtyKeys.length === 0) return;

    setSavingAll(true);
    setError("");
    setMessage("");

    const currentValues = new Map(vars.map((variable) => [variable.env_variable, variable.server_value ?? ""]));
    const updates = Object.fromEntries(
      dirtyKeys.map((key) => {
        if (isRust && runtimeVariable && key === runtimeVariable.env_variable) {
          return [key, selectedRuntime];
        }
        return [key, edits[key] ?? currentValues.get(key) ?? ""];
      }),
    );
    const frameworkNeedsReinstall =
      Boolean(
        isRust &&
        runtimeVariable &&
        dirtyKeys.includes(runtimeVariable.env_variable) &&
        selectedRuntime !== installedRuntime,
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
      frameworkNeedsReinstall
        ? "Saved startup settings. Use the reinstall banner at the top of the panel to apply the new Rust framework."
        : payload?.configPath
          ? `Saved startup settings and synced ${payload.configPath}.`
          : "Saved startup settings.",
    );
    setEdits({});
    setSavingAll(false);
    router.refresh();
    await load();
  }

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
                <h2 className="text-base font-semibold">Rust Runtime</h2>
              </div>
              <p className="mt-1 text-sm text-steel-dim">
                Manage the live Rust runtime, framework mode, and wipe-related startup values.
              </p>
            </div>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
              <RustInstallCard title="Vanilla" body="Default Rust runtime with no modding layer enabled." tone={installedRuntime === "vanilla" ? "active" : "default"} />
              <RustInstallCard title="Staging" body="Preview Rust branch for testing upcoming updates before public release." tone={installedRuntime === "staging" ? "active" : "default"} />
              <RustInstallCard title="Oxide" body="Plugin-ready mode for legacy uMod/Oxide ecosystems." tone={installedRuntime === "oxide" ? "active" : "default"} />
              <RustInstallCard title="Carbon" body="Modern framework mode for Carbon-based plugin stacks." tone={installedRuntime === "carbon" ? "active" : "default"} />
            </div>
          </div>

          <div className="glass rounded-[24px] p-5">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-base font-semibold">Wipe-Day Notes</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-steel-dim">
              <li>Use the settings below for map size, seed, server identity, and RCON values.</li>
              <li>For scheduled map or blueprint resets, set `REGEN_SERVER` and review `REMOVE_FILES` before reinstalling the server.</li>
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
          <div className={cn("space-y-5", isRust ? "bg-[#171d21]" : "px-5 py-5")}>
            {visibleSections.map((section) => (
              <section
                key={section.id}
                className={cn(
                  "rounded-[22px] border border-white/[0.06] bg-white/[0.02]",
                  isRust && "rounded-none border-0 bg-[#171d21]",
                  isRust && section.id === "basic" && "bg-[#171d21]",
                )}
              >
                {!isRust ? (
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2 text-white">
                      <section.icon className="h-4 w-4 text-hyper-300" />
                      <h3 className="text-sm font-semibold">{section.title}</h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-steel-dim">
                      {section.description}
                    </p>
                  </div>
                ) : null}

                {isRust && section.id === "basic" ? (
                  <div className="space-y-8 px-5 py-8 md:px-8">
                    {section.variables
                      .filter((v) => !hiddenRuntimeEnvVars.has(v.env_variable))
                      .sort((a, b) => rustBasicFieldMeta(a).order - rustBasicFieldMeta(b).order)
                      .map((v) => (
                        <RustBasicField
                          key={v.env_variable}
                          variable={v}
                          isRust={isRust}
                          runtimeVariable={runtimeVariable}
                          selectedRuntime={selectedRuntime}
                          installedRuntime={installedRuntime}
                          edits={edits}
                          setEdits={setEdits}
                        />
                      ))}
                  </div>
                ) : isRust && section.id === "world" ? (
                  <RustWorldSection
                    variables={section.variables.filter((v) => !hiddenRuntimeEnvVars.has(v.env_variable))}
                    edits={edits}
                    setEdits={setEdits}
                  />
                ) : isRust && section.id === "weather" ? (
                  <RustWeatherSection
                    variables={section.variables.filter((v) => !hiddenRuntimeEnvVars.has(v.env_variable))}
                    edits={edits}
                    setEdits={setEdits}
                  />
                ) : isRust && section.id === "decay" ? (
                  <RustMappedSection
                    variables={section.variables.filter((v) => !hiddenRuntimeEnvVars.has(v.env_variable))}
                    edits={edits}
                    setEdits={setEdits}
                    metaFor={decayFieldMeta}
                  />
                ) : isRust && section.id === "advanced" ? (
                  <RustMappedSection
                    variables={section.variables.filter((v) => !hiddenRuntimeEnvVars.has(v.env_variable))}
                    edits={edits}
                    setEdits={setEdits}
                    metaFor={advancedFieldMeta}
                  />
                ) : (
                  <ul className="divide-y divide-white/[0.04]">
                    {section.variables
                      .filter((v) => !hiddenRuntimeEnvVars.has(v.env_variable))
                      .map((v) => (
                        <li key={v.env_variable} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_320px]">
                          {(() => {
                            const managedPort = isRustManagedPortVariable(v, isRust);
                            const runtimeField = Boolean(
                              isRust &&
                              runtimeVariable &&
                              v.env_variable === runtimeVariable.env_variable,
                            );
                            const canEdit = v.is_editable && !managedPort;
                            const controlValue = runtimeField
                              ? selectedRuntime
                              : edits[v.env_variable] ?? v.server_value ?? "";

                            return (
                              <>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-white">{v.name}</p>
                                    <Badge tone={canEdit ? "blue" : "steel"}>
                                      {managedPort ? "Managed" : canEdit ? "Editable" : "Locked"}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-xs leading-relaxed text-steel-faint">
                                    {v.description || v.env_variable}
                                  </p>
                                  {managedPort ? (
                                    <p className="mt-2 text-xs text-warning">
                                      This port is assigned automatically by HyperNode during provisioning.
                                    </p>
                                  ) : null}
                                  {runtimeField && selectedRuntime !== installedRuntime ? (
                                    <p className="mt-2 text-xs text-warning">
                                      Saving this change will require a reinstall before the selected runtime profile is actually installed.
                                    </p>
                                  ) : null}
                                  <p className="mt-2 font-mono text-[11px] text-steel-dim">
                                    {v.env_variable}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  {runtimeField ? (
                                    <Select
                                      value={controlValue}
                                      disabled={!canEdit}
                                      onChange={(e) =>
                                        setEdits((s) => ({ ...s, [v.env_variable]: e.target.value }))
                                      }
                                    >
                                      {parseRuntimeOptions().map((option) => (
                                        <option key={option} value={option}>
                                          {runtimeLabel(option)}
                                        </option>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Input
                                      value={controlValue}
                                      disabled={!canEdit}
                                      onChange={(e) =>
                                        setEdits((s) => ({ ...s, [v.env_variable]: e.target.value }))
                                      }
                                    />
                                  )}
                                  {!canEdit ? (
                                    <div className="flex h-full w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-steel-faint">
                                      <Lock className="h-4 w-4" />
                                    </div>
                                  ) : null}
                                </div>
                              </>
                            );
                          })()}
                        </li>
                      ))}
                  </ul>
                )}
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
    const explicitSectionId = rustSectionIdForVariable(variable);
    const bucket = explicitSectionId
      ? buckets.find((section) => section.id === explicitSectionId)
      : buckets.find((section) =>
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

function RustBasicField({
  variable,
  isRust,
  runtimeVariable,
  selectedRuntime,
  installedRuntime,
  edits,
  setEdits,
}: {
  variable: Variable;
  isRust: boolean;
  runtimeVariable: Variable | null;
  selectedRuntime: RustRuntimeProfile;
  installedRuntime: RustRuntimeProfile;
  edits: Record<string, string>;
  setEdits: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const managedPort = isRustManagedPortVariable(variable, isRust);
  const runtimeField = Boolean(
    isRust &&
    runtimeVariable &&
    variable.env_variable === runtimeVariable.env_variable,
  );
  const canEdit = variable.is_editable && !managedPort;
  const controlValue = runtimeField
    ? selectedRuntime
    : edits[variable.env_variable] ?? variable.server_value ?? "";
  const meta = rustBasicFieldMeta(variable);
  const showSlider = isRustMaxPlayersVariable(variable, isRust) && !runtimeField;
  const maxPlayerRange = maxPlayersBounds(controlValue);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-semibold text-white">{meta.label}</p>
        <p className="mt-2 text-sm text-[#dbe4ef]">{meta.helper}</p>
        {managedPort ? (
          <p className="mt-2 text-xs text-warning">
            This port is assigned automatically by HyperNode during provisioning.
          </p>
        ) : null}
        {runtimeField && selectedRuntime !== installedRuntime ? (
          <p className="mt-2 text-xs text-warning">
            Saving this change will require a reinstall before the selected runtime profile is actually installed.
          </p>
        ) : null}
      </div>

      {runtimeField ? (
        <Select
          value={controlValue}
          disabled={!canEdit}
          onChange={(e) =>
            setEdits((s) => ({ ...s, [variable.env_variable]: e.target.value }))
          }
          className="h-14 rounded-lg border-[#4f5964] bg-[#111827] px-4 text-sm text-white"
        >
          {parseRuntimeOptions().map((option) => (
            <option key={option} value={option}>
              {runtimeLabel(option)}
            </option>
          ))}
        </Select>
      ) : showSlider ? (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_150px] md:items-center">
          <input
            type="range"
            min={maxPlayerRange.min}
            max={maxPlayerRange.max}
            value={maxPlayerRange.value}
            disabled={!canEdit}
            onChange={(e) =>
              setEdits((s) => ({ ...s, [variable.env_variable]: e.target.value }))
            }
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-transparent accent-[#28aef3] disabled:cursor-not-allowed"
            style={rangeFillStyle(maxPlayerRange.value, maxPlayerRange.min, maxPlayerRange.max)}
          />
          <Input
            type="number"
            min={maxPlayerRange.min}
            max={maxPlayerRange.max}
            value={controlValue}
            disabled={!canEdit}
            onChange={(e) =>
              setEdits((s) => ({ ...s, [variable.env_variable]: e.target.value }))
            }
            className="h-14 rounded-lg border-[#4f5964] bg-[#111827] px-4 text-sm text-white"
          />
        </div>
      ) : (
        <Input
          value={controlValue}
          disabled={!canEdit}
          onChange={(e) =>
            setEdits((s) => ({ ...s, [variable.env_variable]: e.target.value }))
          }
          className="h-14 rounded-lg border-[#4f5964] bg-[#111827] px-4 text-sm text-white placeholder:text-[#8d949d]"
        />
      )}
    </div>
  );
}

function RustWorldField({
  variable,
  edits,
  setEdits,
}: {
  variable: Variable;
  edits: Record<string, string>;
  setEdits: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const meta = worldFieldMeta(variable);
  const currentValue = currentFieldValue(variable, edits);
  const numeric = worldNumericField(variable, edits, meta);
  const boolOptions = booleanOptions(variable);
  const canEdit = variable.is_editable;

  function updateValue(value: string) {
    setEdits((state) => ({ ...state, [variable.env_variable]: value }));
  }

  function incrementSlider(delta: number) {
    const next = Math.min(numeric.max, Math.max(numeric.min, numeric.value + delta));
    updateValue(numeric.integerLike ? String(Math.round(next)) : String(Number(next.toFixed(1))));
  }

  const generatorOptions = ["Procedural Map", "Barren", "HapisIsland", "CraggyIsland", "SavasIsland"];

  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-[13px] font-semibold leading-5 text-[#e7ebef]">{meta.label}</p>
        <p className="mt-1.5 text-[11px] leading-5 text-[#c7ced6]">{meta.helper}</p>
      </div>

      {meta.kind === "seed" ? (
        <div className="flex h-10 w-[196px] overflow-hidden rounded-md border border-[#65707a] bg-[#30363c]">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateValue(randomRustSeed())}
            className="ring-focus flex w-10 items-center justify-center border-r border-[#18aee6] bg-[#071521] text-[#18aee6] transition-colors hover:bg-[#102338] disabled:opacity-50"
          >
            <Dice5 className="h-4 w-4" />
          </button>
          <Input
            value={currentValue}
            disabled={!canEdit}
            onChange={(e) => updateValue(e.target.value)}
            className="h-full rounded-none border-0 bg-[#30363c] px-3 text-[13px] text-[#eef3f8]"
          />
        </div>
      ) : meta.kind === "select" ? (
        <Select
          value={currentValue}
          disabled={!canEdit}
          onChange={(e) => updateValue(e.target.value)}
          className="h-10 max-w-[533px] rounded-md border-[#65707a] bg-[#30363c] px-3 text-[13px] text-[#eef3f8]"
        >
          {[currentValue, ...generatorOptions]
            .filter((value, index, items) => value && items.indexOf(value) === index)
            .map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        </Select>
      ) : meta.kind === "toggle" ? (
        <div className="flex items-center gap-5 pt-1">
          <button
            type="button"
            role="switch"
            aria-checked={isTruthyValue(currentValue)}
            disabled={!canEdit}
            onClick={() => updateValue(isTruthyValue(currentValue) ? boolOptions.off : boolOptions.on)}
            className={cn(
              "ring-focus relative h-6 w-10 rounded-full transition-colors disabled:opacity-50",
              isTruthyValue(currentValue) ? "bg-[#18aee6]" : "bg-[#30363c]",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-transparent transition-all [&_svg]:text-[#4b545d]",
                isTruthyValue(currentValue) ? "left-[18px]" : "left-0.5",
              )}
            >
              {isTruthyValue(currentValue) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {isTruthyValue(currentValue) ? "✓" : "✕"}
            </span>
          </button>
          <div>
            <p className="text-[13px] font-semibold leading-5 text-[#e7ebef]">{meta.label}</p>
            <p className="mt-1.5 text-[11px] leading-5 text-[#c7ced6]">{meta.helper}</p>
          </div>
        </div>
      ) : meta.kind === "slider" ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,367px)_154px] md:items-center">
          <input
            type="range"
            min={numeric.min}
            max={numeric.max}
            step={numeric.step}
            value={numeric.value}
            disabled={!canEdit}
            onChange={(e) => updateValue(e.target.value)}
            style={rangeFillStyle(numeric.value, numeric.min, numeric.max)}
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full accent-[#18aee6] disabled:cursor-not-allowed"
          />
          <div className="grid h-10 grid-cols-[44px_66px_44px] overflow-hidden rounded-md border border-[#3e3e3e] bg-[#0b0b0c]">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => incrementSlider(-numeric.step)}
              className="ring-focus flex items-center justify-center border-r border-[#3e3e3e] text-[#cfd3d7] transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              min={numeric.min}
              max={numeric.max}
              step={numeric.step}
              value={numeric.display}
              disabled={!canEdit}
              onChange={(e) => updateValue(e.target.value)}
              className="h-full rounded-none border-x border-[#65707a] border-y-0 bg-[#30363c] px-2 text-center text-[13px] leading-none text-[#eef3f8]"
            />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => incrementSlider(numeric.step)}
              className="ring-focus flex items-center justify-center border-l border-[#3e3e3e] text-[#cfd3d7] transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <Input
          value={currentValue}
          disabled={!canEdit}
          onChange={(e) => updateValue(e.target.value)}
          className="h-10 max-w-[533px] rounded-md border-[#65707a] bg-[#30363c] px-3 text-[13px] text-[#eef3f8]"
        />
      )}
    </div>
  );
}

function RustWeatherField({
  variable,
  edits,
  setEdits,
}: {
  variable: Variable;
  edits: Record<string, string>;
  setEdits: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const meta = weatherFieldMeta(variable);
  const currentValue = currentFieldValue(variable, edits);
  const numeric = parseNumericField(variable, edits);
  const boolOptions = booleanOptions(variable);
  const canEdit = variable.is_editable;

  function updateValue(value: string) {
    setEdits((state) => ({ ...state, [variable.env_variable]: value }));
  }

  function incrementSlider(delta: number) {
    const next = Math.min(numeric.max, Math.max(numeric.min, numeric.value + delta));
    updateValue(numeric.integerLike ? String(Math.round(next)) : String(Number(next.toFixed(2))));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[15px] font-semibold text-white">{meta.label}</p>
        <Badge tone={canEdit ? "blue" : "steel"}>{canEdit ? "Editable" : "Locked"}</Badge>
      </div>
      <p className="text-sm text-steel">{meta.helper}</p>

      {meta.kind === "toggle" ? (
        <div className="inline-flex rounded-2xl border border-white/15 bg-[#10243a] p-1">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateValue(boolOptions.on)}
            className={cn(
              "ring-focus rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50",
              isTruthyValue(currentValue) ? "bg-hyper-500 text-white" : "text-steel hover:text-white",
            )}
          >
            On
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateValue(boolOptions.off)}
            className={cn(
              "ring-focus rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50",
              !isTruthyValue(currentValue) ? "bg-white/10 text-white" : "text-steel hover:text-white",
            )}
          >
            Off
          </button>
        </div>
      ) : meta.kind === "slider" ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_255px] md:items-center">
          <input
            type="range"
            min={numeric.min}
            max={numeric.max}
            step={numeric.step}
            value={numeric.value}
            disabled={!canEdit}
            onChange={(e) => updateValue(e.target.value)}
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-hyper-400 disabled:cursor-not-allowed"
          />
          <div className="grid h-16 grid-cols-[70px_1fr_70px] overflow-hidden rounded-2xl border border-white/15 bg-[#10243a]">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => incrementSlider(-numeric.step)}
              className="ring-focus flex items-center justify-center border-r border-white/15 text-steel transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              min={numeric.min}
              max={numeric.max}
              step={numeric.step}
              value={numeric.display}
              disabled={!canEdit}
              onChange={(e) => updateValue(e.target.value)}
              className="h-full rounded-none border-0 bg-[#2a4364] px-4 text-center text-[1.6rem] leading-none text-white"
            />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => incrementSlider(numeric.step)}
              className="ring-focus flex items-center justify-center border-l border-white/15 text-steel transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <Input
          value={currentValue}
          disabled={!canEdit}
          onChange={(e) => updateValue(e.target.value)}
          className="h-16 rounded-2xl border-white/15 bg-[#2a4364] px-4 text-base"
        />
      )}

      <p className="font-mono text-[11px] text-steel-dim">{variable.env_variable}</p>
    </div>
  );
}

function RustWeatherSection({
  variables,
  edits,
  setEdits,
}: {
  variables: Variable[];
  edits: Record<string, string>;
  setEdits: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const ordered = [...variables].sort((a, b) => weatherFieldMeta(a).order - weatherFieldMeta(b).order);
  const primary = ordered.filter((variable) => weatherFieldMeta(variable).order < 50);
  const manual = ordered.filter((variable) => weatherFieldMeta(variable).order >= 50);

  return (
    <div className="space-y-8 px-4 py-5">
      {primary.map((variable) => (
        <RustWeatherField
          key={variable.env_variable}
          variable={variable}
          edits={edits}
          setEdits={setEdits}
        />
      ))}

      {manual.length > 0 ? (
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.02]">
          <div className="border-b border-white/[0.06] px-4 py-4">
            <h4 className="text-[1.15rem] font-semibold text-white">Manual Settings</h4>
            <p className="mt-2 text-sm leading-relaxed text-steel">
              Settings that can override the dynamic weather system. A setting of `-1` allows the dynamic weather system to manage that value.
            </p>
          </div>

          <details className="group">
            <summary className="ring-focus flex cursor-pointer list-none items-center justify-between px-4 py-4 text-left text-sm font-semibold text-steel transition-colors hover:text-white">
              <span>Show more</span>
              <span className="text-lg transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="space-y-8 border-t border-white/[0.06] px-4 py-5">
              {manual.map((variable) => (
                <RustWeatherField
                  key={variable.env_variable}
                  variable={variable}
                  edits={edits}
                  setEdits={setEdits}
                />
              ))}
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}

function RustWorldSection({
  variables,
  edits,
  setEdits,
}: {
  variables: Variable[];
  edits: Record<string, string>;
  setEdits: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const topFields = new Set(["Custom Map", "World Generator", "World Seed", "World Size", "Radiation", "Save Interval"]);
  const animalFields = new Set([
    "Rideable Horse Population",
    "Wolf Population",
    "Chicken Population",
    "Boar Population",
    "Stag Population",
    "Bear Population",
  ]);
  const vehicleFields = new Set([
    "Hot Air Balloon Population",
    "Mini Copter Population",
    "Modular Car Population",
    "Motor Rowboat Population",
    "RHIB Population",
    "Scrap Transport Helicopter Population",
  ]);
  const ordered = [...variables].sort((a, b) => worldFieldMeta(a).order - worldFieldMeta(b).order);
  const top = ordered.filter((variable) => topFields.has(worldFieldMeta(variable).label));
  const animals = ordered.filter((variable) => animalFields.has(worldFieldMeta(variable).label));
  const vehicles = ordered.filter((variable) => vehicleFields.has(worldFieldMeta(variable).label));

  function splitColumns(items: Variable[]) {
    const left: Variable[] = [];
    const right: Variable[] = [];
    items.forEach((item, index) => {
      (index % 2 === 0 ? left : right).push(item);
    });
    return [left, right] as const;
  }

  const [animalLeft, animalRight] = splitColumns(animals);
  const [vehicleLeft, vehicleRight] = splitColumns(vehicles);

  return (
    <div className="max-w-[800px] space-y-8 px-7 py-8">
      <div className="space-y-7">
        {top.map((variable) => (
          <RustWorldField
            key={variable.env_variable}
            variable={variable}
            edits={edits}
            setEdits={setEdits}
          />
        ))}
      </div>

      {animals.length > 0 ? (
        <div className="space-y-5 pt-2">
          <div className="border-b border-white/20 pb-4">
            <h4 className="text-[18px] font-bold leading-6 text-white">Animal Populations</h4>
            <p className="mt-3 text-[13px] leading-5 text-[#aeb8c3]">
              Settings for the number of animals that spawn
            </p>
          </div>
          <div className="grid gap-x-12 gap-y-7 lg:grid-cols-2">
            <div className="space-y-7">
              {animalLeft.map((variable) => (
                <RustWorldField
                  key={variable.env_variable}
                  variable={variable}
                  edits={edits}
                  setEdits={setEdits}
                />
              ))}
            </div>
            <div className="space-y-7">
              {animalRight.map((variable) => (
                <RustWorldField
                  key={variable.env_variable}
                  variable={variable}
                  edits={edits}
                  setEdits={setEdits}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {vehicles.length > 0 ? (
        <div className="space-y-5 pt-2">
          <div className="border-b border-white/20 pb-4">
            <h4 className="text-[18px] font-bold leading-6 text-white">Vehicle Populations</h4>
            <p className="mt-3 text-[13px] leading-5 text-[#aeb8c3]">
              Settings for the number of vehicles that spawn
            </p>
          </div>
          <div className="grid gap-x-12 gap-y-7 lg:grid-cols-2">
            <div className="space-y-7">
              {vehicleLeft.map((variable) => (
                <RustWorldField
                  key={variable.env_variable}
                  variable={variable}
                  edits={edits}
                  setEdits={setEdits}
                />
              ))}
            </div>
            <div className="space-y-7">
              {vehicleRight.map((variable) => (
                <RustWorldField
                  key={variable.env_variable}
                  variable={variable}
                  edits={edits}
                  setEdits={setEdits}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RustMappedField({
  variable,
  edits,
  setEdits,
  meta,
}: {
  variable: Variable;
  edits: Record<string, string>;
  setEdits: Dispatch<SetStateAction<Record<string, string>>>;
  meta: ReturnType<typeof decayFieldMeta> | ReturnType<typeof advancedFieldMeta>;
}) {
  const currentValue = currentFieldValue(variable, edits);
  const numeric = parseNumericField(variable, edits);
  const boolOptions = booleanOptions(variable);
  const canEdit = variable.is_editable;

  function updateValue(value: string) {
    setEdits((state) => ({ ...state, [variable.env_variable]: value }));
  }

  function incrementSlider(delta: number) {
    const next = Math.min(numeric.max, Math.max(numeric.min, numeric.value + delta));
    updateValue(numeric.integerLike ? String(Math.round(next)) : String(Number(next.toFixed(2))));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[15px] font-semibold text-white">{meta.label}</p>
        <Badge tone={canEdit ? "blue" : "steel"}>{canEdit ? "Editable" : "Locked"}</Badge>
      </div>
      <p className="text-sm text-steel">{meta.helper}</p>

      {meta.kind === "toggle" ? (
        <div className="inline-flex rounded-2xl border border-white/15 bg-[#10243a] p-1">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateValue(boolOptions.on)}
            className={cn(
              "ring-focus rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50",
              isTruthyValue(currentValue) ? "bg-hyper-500 text-white" : "text-steel hover:text-white",
            )}
          >
            On
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => updateValue(boolOptions.off)}
            className={cn(
              "ring-focus rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50",
              !isTruthyValue(currentValue) ? "bg-white/10 text-white" : "text-steel hover:text-white",
            )}
          >
            Off
          </button>
        </div>
      ) : meta.kind === "slider" ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_255px] md:items-center">
          <input
            type="range"
            min={numeric.min}
            max={numeric.max}
            step={numeric.step}
            value={numeric.value}
            disabled={!canEdit}
            onChange={(e) => updateValue(e.target.value)}
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-hyper-400 disabled:cursor-not-allowed"
          />
          <div className="grid h-16 grid-cols-[70px_1fr_70px] overflow-hidden rounded-2xl border border-white/15 bg-[#10243a]">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => incrementSlider(-numeric.step)}
              className="ring-focus flex items-center justify-center border-r border-white/15 text-steel transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              min={numeric.min}
              max={numeric.max}
              step={numeric.step}
              value={numeric.display}
              disabled={!canEdit}
              onChange={(e) => updateValue(e.target.value)}
              className="h-full rounded-none border-0 bg-[#2a4364] px-4 text-center text-[1.6rem] leading-none text-white"
            />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => incrementSlider(numeric.step)}
              className="ring-focus flex items-center justify-center border-l border-white/15 text-steel transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : meta.kind === "textarea" ? (
        <Textarea
          value={currentValue}
          disabled={!canEdit}
          onChange={(e) => updateValue(e.target.value)}
          className="min-h-[130px] rounded-2xl border-white/15 bg-[#2a4364] px-4 py-4 text-base"
        />
      ) : (
        <Input
          type={meta.kind === "password" ? "password" : "text"}
          value={currentValue}
          disabled={!canEdit}
          onChange={(e) => updateValue(e.target.value)}
          className="h-16 rounded-2xl border-white/15 bg-[#2a4364] px-4 text-base"
        />
      )}

      <p className="font-mono text-[11px] text-steel-dim">{variable.env_variable}</p>
    </div>
  );
}

function RustMappedSection({
  variables,
  edits,
  setEdits,
  metaFor,
}: {
  variables: Variable[];
  edits: Record<string, string>;
  setEdits: Dispatch<SetStateAction<Record<string, string>>>;
  metaFor: (variable: Variable) => ReturnType<typeof decayFieldMeta> | ReturnType<typeof advancedFieldMeta>;
}) {
  const ordered = [...variables].sort((a, b) => metaFor(a).order - metaFor(b).order);
  const groups = new Map<string, Variable[]>();
  const ungrouped: Variable[] = [];

  for (const variable of ordered) {
    const meta = metaFor(variable);
    if (!meta.group) {
      ungrouped.push(variable);
      continue;
    }
    const current = groups.get(meta.group) ?? [];
    current.push(variable);
    groups.set(meta.group, current);
  }

  return (
    <div className="space-y-8 px-4 py-5">
      {ungrouped.map((variable) => (
        <RustMappedField
          key={variable.env_variable}
          variable={variable}
          edits={edits}
          setEdits={setEdits}
          meta={metaFor(variable)}
        />
      ))}

      {Array.from(groups.entries()).map(([group, groupVariables]) => (
        <div key={group} className="rounded-[22px] border border-white/[0.08] bg-white/[0.02]">
          <div className="border-b border-white/[0.06] px-4 py-4">
            <h4 className="text-[1.15rem] font-semibold text-white">{group}</h4>
            {group === "Custom Server Arguments" ? (
              <p className="mt-2 text-sm leading-relaxed text-steel">
                These values can override config files you have setup, so use them carefully.
              </p>
            ) : null}
          </div>
          <div className="space-y-8 px-4 py-5">
            {groupVariables.map((variable) => (
              <RustMappedField
                key={variable.env_variable}
                variable={variable}
                edits={edits}
                setEdits={setEdits}
                meta={metaFor(variable)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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
