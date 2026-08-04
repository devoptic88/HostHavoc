/**
 * Declarative schema for the Minecraft "Game Settings" forms, modeled on the
 * Nodecraft panel dissection (docs/plan-minecraft-settings-forms.md).
 *
 * Every field maps 1:1 to a server.properties key. Fields marked `optional`
 * render a "Use setting" toggle — when off, the key is removed from the file
 * entirely so the game's built-in default wins.
 */

export type McTab = "basic" | "world" | "gamemode" | "npc" | "advanced";

export type McFieldType = "text" | "int" | "toggle" | "select" | "segmented" | "slider";

export type McField = {
  key: string;
  label: string;
  description?: string;
  type: McFieldType;
  tab: McTab;
  optional?: boolean;
  default?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  readOnly?: boolean;
};

export const MC_TABS: { id: McTab; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "world", label: "Worlds" },
  { id: "gamemode", label: "Gamemode" },
  { id: "npc", label: "NPC" },
  { id: "advanced", label: "Advanced" },
];

export const MC_FIELDS: McField[] = [
  // ── Basic ────────────────────────────────────────────────────────────────
  {
    key: "motd",
    label: "MOTD",
    description: "Message of the Day — displayed below the server name in the server list.",
    type: "text",
    tab: "basic",
    default: "A Minecraft Server",
  },
  {
    key: "max-players",
    label: "Max Players",
    description:
      "Maximum number of players allowed on the server. More players may require more resources.",
    type: "slider",
    tab: "basic",
    min: 1,
    max: 100,
    default: "20",
  },
  {
    key: "player-idle-timeout",
    label: "Player Idle Timeout",
    description:
      "How long (in minutes) a player can be idle before being kicked. Set to 0 to disable.",
    type: "int",
    tab: "basic",
    optional: true,
    min: 0,
    default: "0",
  },
  {
    key: "hide-online-players",
    label: "Hide Online Players",
    description: "When enabled, the online player list is not shown in the server list.",
    type: "toggle",
    tab: "basic",
    default: "false",
  },

  // ── Worlds ───────────────────────────────────────────────────────────────
  {
    key: "level-name",
    label: "World Name",
    description: "Name of the world folder in your server files.",
    type: "text",
    tab: "world",
    default: "world",
  },
  {
    key: "level-seed",
    label: "World Seed",
    description: "Seed used by the level generator. Leave blank for random.",
    type: "text",
    tab: "world",
    optional: true,
    default: "",
  },
  {
    key: "level-type",
    label: "World Type",
    description: "Preset used when generating a new world.",
    type: "select",
    tab: "world",
    default: "minecraft:normal",
    options: [
      { value: "minecraft:normal", label: "Normal (1.19+)" },
      { value: "default", label: "Default (1.18 and prior)" },
      { value: "minecraft:flat", label: "Superflat (1.19+)" },
      { value: "flat", label: "Superflat (1.18 and prior)" },
      { value: "minecraft:large_biomes", label: "Large Biomes (1.19+)" },
      { value: "largeBiomes", label: "Large Biomes (1.18 and prior)" },
      { value: "minecraft:amplified", label: "Amplified (1.19+)" },
      { value: "amplified", label: "Amplified (1.18 and prior)" },
    ],
  },
  {
    key: "generator-settings",
    label: "Generator Settings",
    description: "JSON settings for the world generator, based on world type.",
    type: "text",
    tab: "world",
    optional: true,
    default: "{}",
  },
  {
    key: "generate-structures",
    label: "Generate Structures",
    description: "Whether villages, temples, and other structures generate in new chunks.",
    type: "toggle",
    tab: "world",
    optional: true,
    default: "true",
  },
  {
    key: "spawn-protection",
    label: "Spawn Protection Radius",
    description: "Radius (in blocks) around spawn that non-ops cannot modify.",
    type: "slider",
    tab: "world",
    optional: true,
    min: 0,
    max: 64,
    default: "16",
  },
  {
    key: "max-build-height",
    label: "Max Build Height",
    description: "Maximum height players may build to.",
    type: "slider",
    tab: "world",
    optional: true,
    min: 64,
    max: 320,
    default: "320",
  },
  {
    key: "view-distance",
    label: "View Distance",
    description:
      "Radius (in chunks) of world data sent to each player. Higher values need more resources.",
    type: "slider",
    tab: "world",
    min: 3,
    max: 32,
    default: "10",
  },
  {
    key: "simulation-distance",
    label: "Simulation Distance",
    description:
      "Radius (in chunks) around each player in which entities and blocks are ticked.",
    type: "slider",
    tab: "world",
    min: 3,
    max: 32,
    default: "10",
  },

  // ── Gamemode ─────────────────────────────────────────────────────────────
  {
    key: "gamemode",
    label: "Gamemode",
    type: "segmented",
    tab: "gamemode",
    default: "survival",
    options: [
      { value: "survival", label: "Survival" },
      { value: "creative", label: "Creative" },
      { value: "adventure", label: "Adventure" },
      { value: "spectator", label: "Spectator" },
    ],
  },
  {
    key: "difficulty",
    label: "Difficulty",
    type: "segmented",
    tab: "gamemode",
    optional: true,
    default: "easy",
    options: [
      { value: "peaceful", label: "Peaceful" },
      { value: "easy", label: "Easy" },
      { value: "normal", label: "Normal" },
      { value: "hard", label: "Hard" },
    ],
  },
  {
    key: "force-gamemode",
    label: "Force Gamemode",
    description: "Forces players into the selected gamemode when they join the server.",
    type: "toggle",
    tab: "gamemode",
    optional: true,
    default: "false",
  },
  {
    key: "hardcore",
    label: "Hardcore",
    description: "Players are set to spectator mode when they die.",
    type: "toggle",
    tab: "gamemode",
    optional: true,
    default: "false",
  },
  {
    key: "allow-flight",
    label: "Allow Flight",
    description:
      "Allow survival-mode flight (e.g. via mods). Disabling kicks players the server detects flying.",
    type: "toggle",
    tab: "gamemode",
    optional: true,
    default: "false",
  },
  {
    key: "resource-pack",
    label: "Resource Pack",
    description:
      "Optional direct URL to a resource pack. Players are prompted to download it when joining.",
    type: "text",
    tab: "gamemode",
    optional: true,
    default: "",
  },
  {
    key: "resource-pack-sha1",
    label: "Resource Pack SHA1",
    description:
      "Optional SHA1 digest of the resource pack in lowercase hex. Recommended when using a resource pack.",
    type: "text",
    tab: "gamemode",
    optional: true,
    default: "",
  },

  // ── NPC ──────────────────────────────────────────────────────────────────
  {
    key: "spawn-animals",
    label: "Spawn Animals",
    description: "Whether animals spawn naturally.",
    type: "toggle",
    tab: "npc",
    optional: true,
    default: "true",
  },
  {
    key: "spawn-npcs",
    label: "Spawn NPCs",
    description: "Whether villagers spawn naturally.",
    type: "toggle",
    tab: "npc",
    optional: true,
    default: "true",
  },

  // ── Advanced ─────────────────────────────────────────────────────────────
  {
    key: "max-tick-time",
    label: "Max Tick Time",
    description:
      "Watchdog crashes the server on purpose if a single tick takes longer than this (ms) to avoid world corruption. Set to -1 to disable.",
    type: "int",
    tab: "advanced",
    min: -1,
    default: "60000",
  },
  {
    key: "enable-rcon",
    label: "Enable RCON",
    description: "Allows remote access to the server console via the RCON protocol.",
    type: "toggle",
    tab: "advanced",
    optional: true,
    default: "false",
  },
  {
    key: "rcon.port",
    label: "RCON Port",
    type: "int",
    tab: "advanced",
    optional: true,
    min: 1,
    max: 65535,
    default: "25575",
  },
  {
    key: "rcon.password",
    label: "RCON Password",
    description: "Password required to access RCON.",
    type: "text",
    tab: "advanced",
    optional: true,
    default: "",
  },
  {
    key: "broadcast-rcon-to-ops",
    label: "Broadcast RCON to Ops",
    description: "Broadcasts RCON output to online server operators.",
    type: "toggle",
    tab: "advanced",
    optional: true,
    default: "true",
  },
  {
    key: "enable-query",
    label: "Enable Query",
    description: "Enables the GameSpy4 query protocol used by server list sites.",
    type: "toggle",
    tab: "advanced",
    optional: true,
    default: "false",
  },
  {
    key: "online-mode",
    label: "Online Mode",
    description:
      "Verify players against Mojang's auth servers. Only disable if you know what you're doing.",
    type: "toggle",
    tab: "advanced",
    optional: true,
    default: "true",
  },
  {
    key: "prevent-proxy-connections",
    label: "Prevent Proxy Connections",
    description: "Kick players connecting through a proxy or VPN.",
    type: "toggle",
    tab: "advanced",
    optional: true,
    default: "false",
  },
  {
    key: "server-port",
    label: "Server Port",
    description: "Assigned by your allocation and managed automatically.",
    type: "int",
    tab: "advanced",
    readOnly: true,
  },
  {
    key: "function-permission-level",
    label: "Function Permission Level",
    description: "Default permission level for functions (1–4).",
    type: "int",
    tab: "advanced",
    optional: true,
    min: 1,
    max: 4,
    default: "2",
  },
];

const FIELD_BY_KEY = new Map(MC_FIELDS.map((field) => [field.key, field]));

export function getMcField(key: string) {
  return FIELD_BY_KEY.get(key) ?? null;
}

/**
 * Parse server.properties into a key→value map. Tolerates comments, blank
 * lines, and `=`-less lines; later duplicates win, matching vanilla behavior.
 */
export function parseProperties(text: string) {
  const values = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    values.set(key, line.slice(eq + 1).trim());
  }
  return values;
}

/**
 * Apply updates to server.properties text by patching lines in place so
 * comments, ordering, and unknown keys are preserved. `null` removes the key
 * (the "Use setting" toggle turned off); new keys are appended at the end.
 */
export function applySettings(originalText: string, updates: Record<string, string | null>) {
  const pending = new Map(Object.entries(updates));
  const lines = originalText.split(/\r?\n/);
  const output: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) {
      output.push(rawLine);
      continue;
    }
    const eq = line.indexOf("=");
    const key = eq === -1 ? "" : line.slice(0, eq).trim();
    if (!key || !pending.has(key)) {
      output.push(rawLine);
      continue;
    }
    const next = pending.get(key)!;
    pending.delete(key);
    if (next === null) continue; // drop the line entirely
    output.push(`${key}=${next}`);
  }

  // Trim trailing blank lines first so appended keys don't land after them,
  // then keep a single trailing newline like the vanilla server writes.
  while (output.length > 0 && output[output.length - 1].trim() === "") output.pop();

  pending.forEach((value, key) => {
    if (value === null) return;
    output.push(`${key}=${value}`);
  });
  return output.join("\n") + "\n";
}

/** Validate a single value against its schema field. Returns an error string or null. */
export function validateMcValue(field: McField, value: string): string | null {
  if (field.type === "toggle") {
    return value === "true" || value === "false" ? null : `${field.label} must be true or false`;
  }
  if (field.type === "int" || field.type === "slider") {
    if (!/^-?\d+$/.test(value)) return `${field.label} must be a whole number`;
    const num = Number(value);
    if (field.min !== undefined && num < field.min) {
      return `${field.label} must be at least ${field.min}`;
    }
    if (field.max !== undefined && num > field.max) {
      return `${field.label} must be at most ${field.max}`;
    }
    return null;
  }
  if ((field.type === "select" || field.type === "segmented") && field.options) {
    return field.options.some((option) => option.value === value)
      ? null
      : `${field.label} has an invalid option`;
  }
  return null;
}
