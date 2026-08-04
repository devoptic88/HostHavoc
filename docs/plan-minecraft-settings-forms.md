# Plan: Nodecraft-style Minecraft Settings Forms

## Context
Replicating piece #1 of the Nodecraft dissection (see `~/.claude/plans/i-want-you-to-modular-wreath.md`): tabbed Game Settings forms (Basic / Java / Worlds / Gamemode / NPC / Advanced) that read and write the server's real config files. Nodecraft's core abstraction is a declarative field schema mapped 1:1 to `server.properties` keys, with a **"Use setting" tri-state** — when a field's toggle is off, the key is omitted and the game default wins.

HyperNode already has everything needed underneath:
- Authenticated proxy: `src/app/api/servers/[orderId]/[action]/route.ts` — `file-contents`, `write-file`, `startup`, `update-variable`, `reinstall` all exist.
- Precedent: `src/lib/rustStartup.ts` compiles panel values → config file → `pteroClient.writeFile`. Minecraft settings are the same idea, simpler (flat properties file).
- Existing settings page shell: `src/app/dashboard/servers/[orderId]/settings/page.tsx` + `components/dashboard/ServerSettings.tsx` (rename + reinstall). Game Settings gets its own new page, not crammed in here.

## Architecture

### 1. Schema module — `src/lib/minecraftSettings.ts` (new)
Declarative field schema, the heart of the feature:

```ts
type McFieldType = "text" | "int" | "float" | "toggle" | "select" | "segmented" | "slider";
type McField = {
  key: string;            // server.properties key, e.g. "max-players"
  label: string;
  description?: string;
  type: McFieldType;
  tab: "basic" | "world" | "gamemode" | "npc" | "advanced";
  optional?: boolean;      // renders the "Use setting" toggle; off => key omitted
  default?: string;
  min?: number; max?: number;          // for slider/int
  options?: { value: string; label: string }[]; // for select/segmented
};
```

Populate from the dissection (all defaults verified live on Nodecraft):
- **basic**: motd, max-players (slider 1–100), player-idle-timeout (optional), hide-online-players (toggle)
- **world**: level-name, level-seed (+ client-side random generator), level-type (Nodecraft's version-aware list, start with: normal/default/flat/largeBiomes/amplified), generator-settings, generate-structures, spawn-protection (optional slider), max-build-height, view-distance (slider 3–32), simulation-distance (slider 3–32)
- **gamemode**: gamemode (segmented survival/creative/adventure/spectator), difficulty (segmented peaceful/easy/normal/hard, optional), force-gamemode (optional), hardcore (optional), allow-flight (optional), resource-pack, resource-pack-sha1
- **npc**: spawn-animals, spawn-npcs (both optional toggles)
- **advanced**: max-tick-time, enable-rcon, rcon.port, rcon.password, broadcast-rcon-to-ops, enable-query, online-mode, prevent-proxy-connections, function-permission-level; server-port shown read-only (comes from Ptero allocation)

Also export pure helpers (unit-testable, no I/O):
- `parseProperties(text): Map<string,string>` — tolerant of comments/blank lines, preserves unknown keys.
- `applySettings(originalText, updates: Record<string, string|null>): string` — null = remove key ("Use setting" off); preserves comments/ordering/unknown keys by patching lines, appending new keys at the end.

### 2. API — extend `src/app/api/servers/[orderId]/[action]/route.ts`
Two new actions (thin wrappers, all validation via schema):
- `GET game-settings` → `pteroClient.getFileContents(id, "/server.properties")` → `parseProperties` → `{ values, schemaVersion }`. 404s cleanly if file missing (server never started) — UI shows "start the server once to generate config".
- `POST game-settings` body `{ updates: Record<string, string|null> }` → validate keys against schema (reject unknown keys), fetch current file, `applySettings`, `writeFile`. Return `{ ok, restartRequired: true }`.

Java tab is different — it maps to **egg startup variables**, not files: reuse existing `startup` GET and `save-startup` POST for min/max RAM, and Ptero docker_image for Java version (client API `PUT /settings/docker-image` — add `pteroClient.setDockerImage` if the egg allows it). MVP: render RAM/Java vars generically from the egg's editable variables (same as the existing startup page); skip GC/custom-args until the egg supports them.

### 3. UI
- New route: `src/app/dashboard/servers/[orderId]/game-settings/page.tsx` (server component: resolve order, gate on `order.plan.gameSlug === "minecraft"`; non-MC games don't get the nav link).
- New client component: `src/components/dashboard/MinecraftSettings.tsx`
  - Tab bar (Basic | Java | Worlds | Gamemode | NPC | Advanced) — driven by the schema's `tab` field, matching Nodecraft's layout.
  - Generic `<SettingField>` renderer switching on `type`; slider renders slider+number input pair like Nodecraft.
  - **UseSetting toggle**: for `optional` fields — off = value omitted (key deleted on save), field input disabled/dimmed.
  - Dirty-state tracking; footer **Submit / Reset** per tab (Nodecraft pattern); after save show "Restart required for changes to take effect" banner with a Restart button (existing `power` action).
  - Reuse `Input`, `Button`, `SectionHeader`, glass-card styles from existing dashboard components.
- Add "Game Settings" link to the server nav (wherever console/files/backups tabs are declared — `dashboard/servers/[orderId]/page.tsx` / template).

## Files
- new `src/lib/minecraftSettings.ts` — schema + parse/apply helpers
- new `src/components/dashboard/MinecraftSettings.tsx`
- new `src/app/dashboard/servers/[orderId]/game-settings/page.tsx`
- edit `src/app/api/servers/[orderId]/[action]/route.ts` — add `game-settings` GET/POST
- edit server nav component to add the tab (conditional on minecraft)

## Out of scope (later pieces)
Spigot Settings tab (spigot.yml YAML editing — needs a YAML round-trip strategy), server icon upload, MOTD color-code preview, engine detection (spigot vs paper vs vanilla) for conditional tabs, allowlist/ops/bans pages.

## Verification
1. `npm run dev`, open a provisioned Minecraft server → Game Settings.
2. Load: values match `/server.properties` shown in the Files page.
3. Change max-players + toggle off player-idle-timeout → Submit → re-open Files → confirm `max-players` updated and `player-idle-timeout` line removed, comments preserved.
4. Reset button reverts dirty fields.
5. Unit-test `parseProperties`/`applySettings` round-trips (comments, unknown keys, null deletions).
