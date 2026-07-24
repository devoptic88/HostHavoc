import type { ClientEggVariable } from "@/lib/pterodactyl";

type RustStartupVariable = Pick<
  ClientEggVariable,
  "name" | "description" | "env_variable" | "server_value" | "default_value"
>;

type ConfigEntry = {
  key: string;
  value: string;
};

function variableText(variable: RustStartupVariable) {
  return `${variable.name} ${variable.description} ${variable.env_variable}`.toUpperCase();
}

function currentValue(variable: RustStartupVariable) {
  return (variable.server_value || variable.default_value || "").trim();
}

function quoted(value: string) {
  if (/^-?\d+(\.\d+)?$/.test(value) || /^(true|false)$/i.test(value)) {
    return value;
  }

  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toConfigEntry(variable: RustStartupVariable): ConfigEntry | null {
  const env = variable.env_variable.toUpperCase();
  const text = variableText(variable);
  const value = currentValue(variable);

  if (!value) return null;

  if (text.includes("IDENTITY")) return { key: "server.identity", value };
  if (text.includes("QUERY") && text.includes("PORT")) return { key: "server.queryport", value };
  if (text.includes("APP") && text.includes("PORT")) return { key: "app.port", value };
  if (text.includes("RCON") && text.includes("PORT")) return { key: "rcon.port", value };
  if (text.includes("RCON") && text.includes("PASSWORD")) return { key: "rcon.password", value };
  if (text.includes("RCON") && text.includes("WEB")) return { key: "rcon.web", value };
  if (text.includes("SERVER") && text.includes("PORT")) return { key: "server.port", value };
  if (text.includes("MAXPLAYERS") || text.includes("MAX PLAYERS")) return { key: "server.maxplayers", value };
  if (text.includes("SAVEINTERVAL") || text.includes("SAVE INTERVAL")) return { key: "server.saveinterval", value };
  if (text.includes("TICKRATE") || text.includes("TICK RATE")) return { key: "server.tickrate", value };
  if (text.includes("LEVELURL") || text.includes("CUSTOM MAP") || env === "MAP_URL") {
    return { key: "server.levelurl", value };
  }
  if (text.includes("WORLDSIZE") || text.includes("WORLD SIZE")) return { key: "server.worldsize", value };
  if (text.includes("SEED")) return { key: "server.seed", value };
  if (text.includes("LEVEL")) return { key: "server.level", value };
  if (
    env === "HOSTNAME" ||
    text.includes("SERVER NAME") ||
    text.includes("SERVER TITLE") ||
    text.includes("HOSTNAME")
  ) {
    return { key: "server.hostname", value };
  }
  if (env === "DESCRIPTION" || text.includes("DESCRIPTION")) return { key: "server.description", value };
  if (env === "URL" || (text.includes("URL") && !text.includes("MAP") && !text.includes("HEADER"))) {
    return { key: "server.url", value };
  }
  if (env === "HEADERIMAGE" || text.includes("HEADERIMAGE") || text.includes("HEADER IMAGE")) {
    return { key: "server.headerimage", value };
  }

  return null;
}

export function isRustStartupProfile(vars: RustStartupVariable[]) {
  return vars.some((variable) => {
    const text = variableText(variable);
    return (
      text.includes("IDENTITY") ||
      text.includes("WORLDSIZE") ||
      text.includes("PROCEDURAL MAP") ||
      text.includes("RCON")
    );
  });
}

export function buildRustServerConfig(vars: RustStartupVariable[]) {
  const entries = new Map<string, string>();

  for (const variable of vars) {
    const entry = toConfigEntry(variable);
    if (!entry) continue;
    entries.set(entry.key, entry.value);
  }

  const identity = entries.get("server.identity");
  if (!identity) return null;

  if (entries.has("server.levelurl")) {
    entries.delete("server.level");
    entries.delete("server.seed");
    entries.delete("server.worldsize");
  } else {
    entries.delete("server.levelurl");
  }

  const orderedKeys = [
    "server.identity",
    "server.hostname",
    "server.description",
    "server.url",
    "server.headerimage",
    "server.port",
    "server.queryport",
    "app.port",
    "rcon.port",
    "rcon.password",
    "rcon.web",
    "server.levelurl",
    "server.level",
    "server.seed",
    "server.worldsize",
    "server.maxplayers",
    "server.saveinterval",
    "server.tickrate",
  ];

  const lines = [
    "// Managed by HyperNode startup settings.",
    "// Most player-facing Rust values are mirrored here and refreshed on save.",
    "",
    ...orderedKeys
      .filter((key) => entries.has(key))
      .map((key) => `${key} ${quoted(entries.get(key) ?? "")}`),
  ];

  return {
    path: `server/${identity}/cfg/server.cfg`,
    content: `${lines.join("\n")}\n`,
  };
}
