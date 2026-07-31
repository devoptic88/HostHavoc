"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  const compact = compactVariableText(variable);
  const env = variable.env_variable.toUpperCase();

  if (env === "DESCRIPTION" || compact.includes("DESCRIPTION")) {
    return {
      order: 1,
      label: "Server Description",
      helper: "Appears under Server Name in listing",
    };
  }

  if (
    env === "HOSTNAME" ||
    compact.includes("SERVERNAME") ||
    compact.includes("SERVERTITLE") ||
    compact.includes("HOSTNAME")
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
    compact.includes("HEADERIMAGE") ||
    compact.includes("SERVERIMAGE") ||
    compact.includes("BANNER")
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

  if (env === "URL" || (compact.includes("URL") && !compact.includes("MAP") && !compact.includes("HEADER"))) {
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
  const compact = compactVariableText(variable);

  const definitions = [
    {
      match: () => compact.includes("RAINWETNESS"),
      label: "Rain Wetness",
      helper: "How wet players get when standing in rain",
      order: 0,
      group: "top",
    },
    {
      match: () => compact.includes("SNOWWETNESS"),
      label: "Snow Wetness",
      helper: "How wet players get when standing in snow",
      order: 1,
      group: "top",
    },
    {
      match: () => compact.includes("CLEARCHANCE"),
      label: "Clear Chance",
      helper: "How often clear weather is picked by the dynamic weather system",
      order: 10,
      group: "weights",
    },
    {
      match: () => compact.includes("DUSTCHANCE"),
      label: "Dust Chance",
      helper: "How often dust weather is picked by the dynamic weather system",
      order: 11,
      group: "weights",
    },
    {
      match: () => compact.includes("FOGCHANCE"),
      label: "Fog Chance",
      helper: "How often fog weather is picked by the dynamic weather system",
      order: 12,
      group: "weights",
    },
    {
      match: () => compact.includes("OVERCASTCHANCE"),
      label: "Overcast Chance",
      helper: "How often overcast weather is picked by the dynamic weather system",
      order: 13,
      group: "weights",
    },
    {
      match: () => compact.includes("STORMCHANCE"),
      label: "Storm Chance",
      helper: "How often storm weather is picked by the dynamic weather system",
      order: 14,
      group: "weights",
    },
    {
      match: () => compact.includes("RAINCHANCE"),
      label: "Rain Chance",
      helper: "How often rain weather is picked by the dynamic weather system",
      order: 15,
      group: "weights",
    },
    { match: () => compact.includes("WEATHERRAIN") || compact === "RAIN", label: "Rain", helper: "How much it should rain", order: 50, group: "manual" },
    { match: () => compact.includes("WEATHERWIND") || compact === "WIND", label: "Wind", helper: "How much wind there is", order: 51, group: "manual" },
    { match: () => compact.includes("WEATHERTHUNDER") || compact === "THUNDER", label: "Thunder and Lightning", helper: "How much thunder and lightning there is", order: 52, group: "manual" },
    { match: () => compact.includes("WEATHERFOG") || compact === "FOG", label: "Fog", helper: "How much fog there should be", order: 53, group: "manual" },
    { match: () => compact.includes("WEATHERDUST") || compact === "DUST", label: "Dust", helper: "How much dust there should be", order: 54, group: "manual" },
    { match: () => compact.includes("WEATHERCLOUDS") || compact === "CLOUDS", label: "Clouds", helper: "How cloudy it should be", order: 55, group: "manual" },
    { match: () => compact.includes("RAINBOW"), label: "Rainbow", helper: "Affects how visible rainbows are in the sky", order: 56, group: "manual" },
    { match: () => compact.includes("RAYLEIGH"), label: "Rayleigh Scattering Intensity", helper: "Affects atmospheric Rayleigh scattering intensity", order: 57, group: "manual" },
    { match: () => compact.includes("MIESCATTER"), label: "Mie Scattering Intensity", helper: "Affects atmospheric Mie scattering intensity", order: 58, group: "manual" },
    { match: () => compact.includes("SKYBRIGHT"), label: "Sky Brightness", helper: "Affects the brightness of the sky", order: 59, group: "manual" },
    { match: () => compact.includes("SKYCONTRAST"), label: "Sky Contrast", helper: "Affects the contrast of the sky", order: 60, group: "manual" },
    { match: () => compact.includes("ATMOSPHERE") && compact.includes("DIRECTION"), label: "Atmosphere Directionality", helper: "Affects atmospheric light directionality", order: 61, group: "manual" },
    { match: () => compact.includes("CLOUDLAYER") && compact.includes("SIZE"), label: "Cloud Layer Size", helper: "Affects the size of the cloud layer", order: 62, group: "manual" },
    { match: () => compact.includes("CLOUDOPACITY"), label: "Cloud Opacity", helper: "Affects cloud opacity", order: 63, group: "manual" },
    { match: () => compact.includes("CLOUDCOVERAGE") || compact.includes("CLOUDCOVER"), label: "Cloud Coverage", helper: "Affects cloud coverage", order: 64, group: "manual" },
    { match: () => compact.includes("CLOUDSHARP"), label: "Cloud Sharpness", helper: "Affects cloud edge sharpness", order: 65, group: "manual" },
    { match: () => compact.includes("CLOUDCOLOR"), label: "Cloud Coloring", helper: "Affects how much color clouds gets from the sky and sun", order: 66, group: "manual" },
    { match: () => compact.includes("CLOUDATTENUATION"), label: "Cloud Attenuation", helper: "Affects how dark clouds should be as they get thicker", order: 67, group: "manual" },
    { match: () => compact.includes("CLOUDSCATTER"), label: "Cloud Scattering", helper: "Affects how much light clouds scatter (which causes bloom)", order: 68, group: "manual" },
    { match: () => compact.includes("CLOUDBRIGHT"), label: "Cloud Brightness", helper: "Affects the brightness of clouds", order: 69, group: "manual" },
  ] as const;

  const found = definitions.find((definition) => definition.match());
  return {
    label: found?.label ?? variable.name,
    order: found?.order ?? 100,
    group: found?.group ?? "manual",
    kind: "slider",
    helper: found?.helper ?? variable.description ?? variable.env_variable,
  };
}

function formatWeatherDisplay(value: number) {
  return String(Number(value.toFixed(2)));
}

function boundedWeatherNumericField(
  numeric: ReturnType<typeof parseNumericField>,
  min: number,
  max: number,
) {
  const value = Math.min(max, Math.max(min, numeric.value));

  return {
    ...numeric,
    min,
    max,
    step: 0.01,
    value,
    display: formatWeatherDisplay(value),
    integerLike: false,
  };
}

function weatherNumericField(
  variable: Variable,
  edits: Record<string, string>,
  meta: ReturnType<typeof weatherFieldMeta>,
) {
  const numeric = parseNumericField(variable, edits);

  if (meta.group === "manual") {
    return boundedWeatherNumericField(numeric, -1, 1);
  }

  return boundedWeatherNumericField(numeric, 0, 1);
}

function decayFieldMeta(variable: Variable) {
  const text = variableText(variable);
  const compact = compactVariableText(variable);

  const definitions = [
    { match: () => compact.includes("DECAYSCALE"), label: "Decay Scale", order: 0, group: null },
    { match: () => compact.includes("DECAYDELAY"), label: "Decay Delay", order: 10, group: "Delay for Building Decay" },
    { match: () => compact.includes("UPKEEP"), label: variable.name, order: 20, group: "Upkeep" },
    { match: () => compact.includes("BUILDING") && compact.includes("DECAY"), label: variable.name, order: 30, group: "Building Decay" },
    { match: () => compact.includes("TC") || compact.includes("TOOLCUPBOARD"), label: variable.name, order: 40, group: "Tool Cupboard" },
    { match: () => compact.includes("PVE") || compact.includes("PVP"), label: variable.name, order: 50, group: "Gameplay" },
    { match: () => compact.includes("GATHER") || compact.includes("XP") || compact.includes("CRAFT"), label: variable.name, order: 60, group: "Gameplay" },
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
  const compact = compactVariableText(variable);

  const definitions = [
    { match: () => compact.includes("TICKRATE"), label: "Tickrate", order: 0, kind: "slider", group: null },
    { match: () => compact.includes("RCON") && compact.includes("PASSWORD"), label: "RCON Password", order: 1, kind: "password", group: null },
    { match: () => compact.includes("RCON") && compact.includes("WEB"), label: "Enable Web RCON", order: 2, kind: "toggle", group: null },
    { match: () => compact.includes("SECUREBOOT") || compact.includes("TPM"), label: "Secure Boot Enforcement", order: 3, kind: "toggle", group: null },
    { match: () => compact.includes("CONVAR") || compact.includes("ARGUMENT"), label: "ConVars", order: 50, kind: "textarea", group: "Custom Server Arguments" },
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

  if (
    env === "URL" ||
    compact.includes("SERVERNAME") ||
    compact.includes("SERVERTITLE") ||
    compact.includes("HOSTNAME") ||
    compact.includes("DESCRIPTION") ||
    compact.includes("HEADERIMAGE") ||
    compact.includes("SERVERIMAGE") ||
    compact.includes("MAXPLAYERS") ||
    (compact.includes("URL") && !compact.includes("MAP") && !compact.includes("LEVEL"))
  ) {
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

  if (
    compact.includes("RAINWETNESS") ||
    compact.includes("SNOWWETNESS") ||
    compact.includes("CLEARCHANCE") ||
    compact.includes("DUSTCHANCE") ||
    compact.includes("FOGCHANCE") ||
    compact.includes("OVERCASTCHANCE") ||
    compact.includes("STORMCHANCE") ||
    compact.includes("RAINCHANCE") ||
    compact.includes("WEATHERRAIN") ||
    compact.includes("WEATHERWIND") ||
    compact.includes("WEATHERTHUNDER") ||
    compact.includes("WEATHERFOG") ||
    compact.includes("WEATHERDUST") ||
    compact.includes("WEATHERCLOUDS") ||
    compact.includes("RAINBOW") ||
    compact.includes("RAYLEIGH") ||
    compact.includes("MIESCATTER") ||
    compact.includes("SKYBRIGHT") ||
    compact.includes("SKYCONTRAST") ||
    (compact.includes("ATMOSPHERE") && compact.includes("DIRECTION")) ||
    (compact.includes("CLOUDLAYER") && compact.includes("SIZE")) ||
    compact.includes("CLOUDOPACITY") ||
    compact.includes("CLOUDCOVERAGE") ||
    compact.includes("CLOUDCOVER") ||
    compact.includes("CLOUDSHARP") ||
    compact.includes("CLOUDCOLOR") ||
    compact.includes("CLOUDATTENUATION") ||
    compact.includes("CLOUDSCATTER") ||
    compact.includes("CLOUDBRIGHT")
  ) {
    return "weather";
  }

  if (
    compact.includes("DECAYSCALE") ||
    compact.includes("DECAYDELAY") ||
    compact.includes("UPKEEP") ||
    (compact.includes("BUILDING") && compact.includes("DECAY")) ||
    compact.includes("TOOLCUPBOARD") ||
    compact.includes("PVE") ||
    compact.includes("PVP") ||
    compact.includes("GATHER") ||
    compact.includes("CRAFT") ||
    compact.includes("XP")
  ) {
    return "decay";
  }

  if (
    compact.includes("TICKRATE") ||
    (compact.includes("RCON") && compact.includes("PASSWORD")) ||
    (compact.includes("RCON") && compact.includes("WEB")) ||
    compact.includes("SECUREBOOT") ||
    compact.includes("TPM") ||
    compact.includes("CONVAR") ||
    compact.includes("ARGUMENT") ||
    compact.includes("QUERYPORT") ||
    compact.includes("APPPORT") ||
    compact.includes("SERVERPORT") ||
    compact.includes("STEAM")
  ) {
    return "advanced";
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
    matchers: ["WEATHER", "RAIN", "FOG", "WIND", "SNOW", "DUST", "STORM", "OVERCAST", "CLOUD", "CLIMATE", "TIME"],
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
      {startupCmd && (
        <details className={cn("glass group rounded-2xl", isRust && "border-white/10 bg-[#091019]")}>
          <summary className="ring-focus flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-steel-faint">
              Startup command
            </span>
            <span className="text-sm text-steel transition-transform group-open:rotate-180">v</span>
          </summary>
          <div className="border-t border-white/[0.06] px-5 py-4">
            <code className="block break-all font-mono text-xs text-steel">{startupCmd}</code>
          </div>
        </details>
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
                  <div className="max-w-[800px] space-y-7 px-7 py-8">
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
    const compactHaystack = haystack.replace(/[^A-Z0-9]/g, "");
    const explicitSectionId = rustSectionIdForVariable(variable);
    const bucket = explicitSectionId
      ? buckets.find((section) => section.id === explicitSectionId)
      : buckets.find((section) =>
          section.matchers.some((matcher) => {
            const compactMatcher = matcher.replace(/[^A-Z0-9]/g, "");
            return haystack.includes(matcher) || compactHaystack.includes(compactMatcher);
          }),
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
    <div className="space-y-2.5">
      <div>
        <p className="text-[13px] font-semibold leading-5 text-[#e7ebef]">{meta.label}</p>
        <p className="mt-1.5 text-[11px] leading-5 text-[#c7ced6]">{meta.helper}</p>
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
          className="h-10 max-w-[533px] rounded-md border-[#65707a] bg-[#30363c] px-3 text-[13px] text-[#eef3f8]"
        >
          {parseRuntimeOptions().map((option) => (
            <option key={option} value={option}>
              {runtimeLabel(option)}
            </option>
          ))}
        </Select>
      ) : showSlider ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,367px)_154px] md:items-center">
          <input
            type="range"
            min={maxPlayerRange.min}
            max={maxPlayerRange.max}
            value={maxPlayerRange.value}
            disabled={!canEdit}
            onChange={(e) =>
              setEdits((s) => ({ ...s, [variable.env_variable]: e.target.value }))
            }
            className="h-2.5 w-full cursor-pointer appearance-none rounded-full accent-[#18aee6] disabled:cursor-not-allowed"
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
            className="h-10 rounded-md border-[#65707a] bg-[#30363c] px-3 text-[13px] text-[#eef3f8]"
          />
        </div>
      ) : (
        <Input
          value={controlValue}
          disabled={!canEdit}
          onChange={(e) =>
            setEdits((s) => ({ ...s, [variable.env_variable]: e.target.value }))
          }
          className="h-10 max-w-[533px] rounded-md border-[#65707a] bg-[#30363c] px-3 text-[13px] text-[#eef3f8] placeholder:text-[#8d949d]"
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
  const numeric = weatherNumericField(variable, edits, meta);
  const canEdit = variable.is_editable;
  const manualOverride = meta.group === "manual";
  const manualEnabled = numeric.value !== -1;

  function updateValue(value: string) {
    setEdits((state) => ({ ...state, [variable.env_variable]: value }));
  }

  function incrementSlider(delta: number) {
    const next = Math.min(numeric.max, Math.max(numeric.min, numeric.value + delta));
    updateValue(formatWeatherDisplay(next));
  }

  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-[13px] font-semibold leading-5 text-[#e7ebef]">{meta.label}</p>
        <p className="mt-1.5 text-[11px] leading-5 text-[#c7ced6]">{meta.helper}</p>
      </div>

      {meta.kind === "slider" ? (
        <div
          className={cn(
            "grid gap-3 md:items-center",
            manualOverride
              ? "md:grid-cols-[40px_minmax(0,367px)_154px]"
              : "md:grid-cols-[minmax(0,367px)_154px]",
          )}
        >
          {manualOverride ? (
            <button
              type="button"
              role="switch"
              aria-checked={manualEnabled}
              disabled={!canEdit}
              onClick={() => updateValue(manualEnabled ? "-1" : "1")}
              className={cn(
                "ring-focus relative h-6 w-10 rounded-full transition-colors disabled:opacity-50",
                manualEnabled ? "bg-[#18aee6]" : "bg-[#30363c]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white transition-all [&_svg]:text-[#4b545d]",
                  manualEnabled ? "left-[18px]" : "left-0.5",
                )}
              >
                {manualEnabled ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </span>
            </button>
          ) : null}
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
  const top = ordered.filter((variable) => weatherFieldMeta(variable).group === "top");
  const weights = ordered.filter((variable) => weatherFieldMeta(variable).group === "weights");
  const manual = ordered.filter((variable) => weatherFieldMeta(variable).group === "manual");

  function splitColumns(items: Variable[]) {
    const left: Variable[] = [];
    const right: Variable[] = [];
    items.forEach((item, index) => {
      (index % 2 === 0 ? left : right).push(item);
    });
    return [left, right] as const;
  }

  const [topLeft, topRight] = splitColumns(top);
  const [weightsLeft, weightsRight] = splitColumns(weights);
  const [manualLeft, manualRight] = splitColumns(manual);

  return (
    <div className="max-w-[800px] space-y-8 px-7 py-8">
      {top.length > 0 ? (
        <div className="grid gap-x-12 gap-y-7 lg:grid-cols-2">
          <div className="space-y-7">
            {topLeft.map((variable) => (
              <RustWeatherField
                key={variable.env_variable}
                variable={variable}
                edits={edits}
                setEdits={setEdits}
              />
            ))}
          </div>
          <div className="space-y-7">
            {topRight.map((variable) => (
              <RustWeatherField
                key={variable.env_variable}
                variable={variable}
                edits={edits}
                setEdits={setEdits}
              />
            ))}
          </div>
        </div>
      ) : null}

      {weights.length > 0 ? (
        <div className="space-y-5 pt-2">
          <div className="border-b border-white/20 pb-4">
            <h4 className="text-[18px] font-bold leading-6 text-white">Dynamic Weather System Weights</h4>
            <p className="mt-3 text-[13px] leading-5 text-[#aeb8c3]">
              Settings for how often a weather type is chosen by the dynamic weather system
            </p>
          </div>
          <div className="grid gap-x-12 gap-y-7 lg:grid-cols-2">
            <div className="space-y-7">
              {weightsLeft.map((variable) => (
                <RustWeatherField
                  key={variable.env_variable}
                  variable={variable}
                  edits={edits}
                  setEdits={setEdits}
                />
              ))}
            </div>
            <div className="space-y-7">
              {weightsRight.map((variable) => (
                <RustWeatherField
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

      {manual.length > 0 ? (
        <div className="space-y-5 pt-2">
          <div className="border-b border-white/20 pb-4">
            <h4 className="text-[18px] font-bold leading-6 text-white">Manual Settings</h4>
            <p className="mt-3 text-[13px] leading-5 text-[#aeb8c3]">
              Settings that can override the dynamic weather system. A setting of `-1` allows the dynamic weather system to manage that value.
            </p>
          </div>

          <details className="group">
            <summary className="ring-focus inline-flex h-10 cursor-pointer list-none items-center gap-4 rounded-md border border-[#334964] bg-[#10243a] px-4 text-[13px] font-semibold text-[#aeb8c3] transition-colors hover:text-white">
              <span>Show more</span>
              <span className="text-lg transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-7 grid gap-x-12 gap-y-7 lg:grid-cols-2">
              <div className="space-y-7">
                {manualLeft.map((variable) => (
                  <RustWeatherField
                    key={variable.env_variable}
                    variable={variable}
                    edits={edits}
                    setEdits={setEdits}
                  />
                ))}
              </div>
              <div className="space-y-7">
                {manualRight.map((variable) => (
                  <RustWeatherField
                    key={variable.env_variable}
                    variable={variable}
                    edits={edits}
                    setEdits={setEdits}
                  />
                ))}
              </div>
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
    <div className="space-y-2.5">
      <div>
        <p className="text-[13px] font-semibold leading-5 text-[#e7ebef]">{meta.label}</p>
        <p className="mt-1.5 text-[11px] leading-5 text-[#c7ced6]">{meta.helper}</p>
      </div>

      {meta.kind === "toggle" ? (
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
                "absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white transition-all [&_svg]:text-[#4b545d]",
                isTruthyValue(currentValue) ? "left-[18px]" : "left-0.5",
              )}
            >
              {isTruthyValue(currentValue) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            </span>
          </button>
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
      ) : meta.kind === "textarea" ? (
        <Textarea
          value={currentValue}
          disabled={!canEdit}
          onChange={(e) => updateValue(e.target.value)}
          className="min-h-[88px] max-w-[533px] rounded-md border-[#65707a] bg-[#30363c] px-3 py-3 text-[13px] text-[#eef3f8]"
        />
      ) : (
        <Input
          type={meta.kind === "password" ? "password" : "text"}
          value={currentValue}
          disabled={!canEdit}
          onChange={(e) => updateValue(e.target.value)}
          className="h-10 max-w-[533px] rounded-md border-[#65707a] bg-[#30363c] px-3 text-[13px] text-[#eef3f8]"
        />
      )}
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
    <div className="max-w-[800px] space-y-8 px-7 py-8">
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
        <div key={group} className="space-y-5 pt-2">
          <div className="border-b border-white/20 pb-4">
            <h4 className="text-[18px] font-bold leading-6 text-white">{group}</h4>
            {group === "Custom Server Arguments" ? (
              <p className="mt-3 text-[13px] leading-5 text-[#aeb8c3]">
                These values can override config files you have setup, so use them carefully.
              </p>
            ) : null}
          </div>
          <div className="space-y-7">
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
