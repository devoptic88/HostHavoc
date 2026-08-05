/**
 * Spigot Settings schema, mirroring the Nodecraft panel's page of the same
 * name. It spans two files: spigot.yml holds general behaviour and player
 * messages, while spawn limits and tick rates actually live in bukkit.yml.
 *
 * Key sets differ across Minecraft versions (1.17 added axolotls, 1.18 split
 * water-ambient, and so on), so the UI renders only the fields a given
 * server's config actually contains rather than inventing keys.
 */

export type SpigotFile = "spigot" | "bukkit";

export type SpigotSection =
  | "general"
  | "messages"
  | "spawn-limits"
  | "ticks";

export type SpigotFieldType = "text" | "int" | "float" | "toggle";

export type SpigotField = {
  /** Dotted path within the file. */
  path: string;
  file: SpigotFile;
  section: SpigotSection;
  label: string;
  description?: string;
  type: SpigotFieldType;
  min?: number;
  max?: number;
};

export const SPIGOT_FILES: Record<SpigotFile, string> = {
  spigot: "/spigot.yml",
  bukkit: "/bukkit.yml",
};

export const SPIGOT_SECTIONS: { id: SpigotSection; label: string; description: string }[] = [
  {
    id: "general",
    label: "General Settings",
    description: "Item despawning, merge radii, mob spawn range, and movement checks.",
  },
  {
    id: "messages",
    label: "Messages",
    description: "Text shown to players for certain events. {0} is replaced with the version.",
  },
  {
    id: "spawn-limits",
    label: "Spawn Limits",
    description: "Caps how many of each mob category can spawn around players.",
  },
  {
    id: "ticks",
    label: "Tick Based Settings",
    description: "How often (in ticks) the server attempts each task. 20 ticks is one second.",
  },
];

export const SPIGOT_FIELDS: SpigotField[] = [
  // ── General (spigot.yml) ────────────────────────────────────────────────
  {
    path: "world-settings.default.item-despawn-rate",
    file: "spigot",
    section: "general",
    label: "Item Despawn Timer",
    description: "How long (in ticks) dropped items stay on the ground before despawning.",
    type: "int",
    min: 1,
  },
  {
    path: "world-settings.default.merge-radius.exp",
    file: "spigot",
    section: "general",
    label: "Experience Orb Merge Radius",
    description: "Radius (in blocks) within which experience orbs clump together.",
    type: "float",
  },
  {
    path: "world-settings.default.merge-radius.item",
    file: "spigot",
    section: "general",
    label: "Dropped Item Merge Radius",
    description: "Radius (in blocks) within which matching dropped items clump together.",
    type: "float",
  },
  {
    path: "world-settings.default.mob-spawn-range",
    file: "spigot",
    section: "general",
    label: "Mob Spawn Range",
    description: "Radius (in chunks) around players where mobs may spawn.",
    type: "int",
    min: 1,
    max: 16,
  },
  {
    path: "commands.log",
    file: "spigot",
    section: "general",
    label: "Log Player Commands",
    description: "Print player commands to the console and log files.",
    type: "toggle",
  },
  {
    path: "commands.silent-commandblock-console",
    file: "spigot",
    section: "general",
    label: "Silence Command Block Output",
    description: "Stop command block output from reaching the server console.",
    type: "toggle",
  },
  {
    path: "settings.moved-wrongly-threshold",
    file: "spigot",
    section: "general",
    label: "Moved Wrongly Threshold",
    description:
      "Sensitivity of the moved-wrongly check. Higher values reduce rubberbanding but are easier to exploit.",
    type: "float",
  },
  {
    path: "settings.moved-too-quickly-multiplier",
    file: "spigot",
    section: "general",
    label: "Moved Too Quickly Multiplier",
    description: "Sensitivity of the speed check — the maximum speed a player may move at.",
    type: "float",
  },
  // Allow End and the shutdown message are bukkit.yml, despite the page name.
  {
    path: "settings.allow-end",
    file: "bukkit",
    section: "general",
    label: "Allow End",
    description: "Allow players to enter the End dimension.",
    type: "toggle",
  },

  // ── Messages (spigot.yml + bukkit.yml) ──────────────────────────────────
  {
    path: "messages.whitelist",
    file: "spigot",
    section: "messages",
    label: "Whitelist",
    description: "Shown when a player who is not on the allowlist tries to join.",
    type: "text",
  },
  {
    path: "messages.unknown-command",
    file: "spigot",
    section: "messages",
    label: "Unknown Command",
    description: "Shown when a player runs a command that does not exist.",
    type: "text",
  },
  {
    path: "messages.server-full",
    file: "spigot",
    section: "messages",
    label: "Server Full",
    description: "Shown when a player tries to join a server with no free slots.",
    type: "text",
  },
  {
    path: "messages.outdated-client",
    file: "spigot",
    section: "messages",
    label: "Outdated Client",
    description: "Shown when a player's client is older than the server. {0} is the version.",
    type: "text",
  },
  {
    path: "messages.outdated-server",
    file: "spigot",
    section: "messages",
    label: "Outdated Server",
    description: "Shown when a player's client is newer than the server. {0} is the version.",
    type: "text",
  },
  {
    path: "messages.restart",
    file: "spigot",
    section: "messages",
    label: "Restart",
    description: "Shown to players when the server is restarting.",
    type: "text",
  },
  {
    path: "settings.shutdown-message",
    file: "bukkit",
    section: "messages",
    label: "Server Shutdown Message",
    description: "Shown to players when the server goes offline.",
    type: "text",
  },

  // ── Spawn limits (bukkit.yml) ───────────────────────────────────────────
  ...(
    [
      ["monsters", "Monsters", "Hostile mobs."],
      ["animals", "Animals", "Cows, pigs, sheep, horses, and so on."],
      ["water-animals", "Water Animals", "Squids and dolphins."],
      ["water-ambient", "Water Ambient", "Fish."],
      ["water-underground-creature", "Water Underground Creature", "Glow squids."],
      ["axolotls", "Axolotls", "Axolotls."],
      ["ambient", "Ambient Creatures", "Bats."],
    ] as const
  ).map(
    ([key, label, description]): SpigotField => ({
      path: `spawn-limits.${key}`,
      file: "bukkit",
      section: "spawn-limits",
      label,
      description,
      type: "int",
      min: 0,
    }),
  ),

  // ── Tick rates (bukkit.yml) ─────────────────────────────────────────────
  ...(
    [
      ["animal-spawns", "Animal Spawns", "How often the server tries to spawn animals."],
      ["monster-spawns", "Monster Spawns", "How often the server tries to spawn hostile mobs."],
      ["water-spawns", "Water Animal Spawns", "How often the server tries to spawn squids and dolphins."],
      ["water-ambient-spawns", "Water Ambient Spawns", "How often the server tries to spawn fish."],
      [
        "water-underground-creature-spawns",
        "Water Underground Creature Spawns",
        "How often the server tries to spawn glow squids.",
      ],
      ["axolotl-spawns", "Axolotl Spawns", "How often the server tries to spawn axolotls."],
      ["ambient-spawns", "Ambient Spawns", "How often the server tries to spawn bats."],
      ["autosave", "Autosave", "How often the world is saved to disk."],
    ] as const
  ).map(
    ([key, label, description]): SpigotField => ({
      path: `ticks-per.${key}`,
      file: "bukkit",
      section: "ticks",
      label,
      description,
      type: "int",
      min: 1,
    }),
  ),
];

const FIELD_BY_KEY = new Map(SPIGOT_FIELDS.map((field) => [`${field.file}:${field.path}`, field]));

export function getSpigotField(file: string, path: string) {
  return FIELD_BY_KEY.get(`${file}:${path}`) ?? null;
}

export function validateSpigotValue(field: SpigotField, value: string): string | null {
  if (field.type === "toggle") {
    return value === "true" || value === "false" ? null : `${field.label} must be true or false`;
  }
  if (field.type === "int" || field.type === "float") {
    const pattern = field.type === "int" ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/;
    if (!pattern.test(value)) {
      return `${field.label} must be a ${field.type === "int" ? "whole number" : "number"}`;
    }
    const num = Number(value);
    if (field.min !== undefined && num < field.min) return `${field.label} must be at least ${field.min}`;
    if (field.max !== undefined && num > field.max) return `${field.label} must be at most ${field.max}`;
  }
  return null;
}
