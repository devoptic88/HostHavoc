export type GameCategory = "survival" | "popular" | "fps" | "sandbox";

export interface GameFaq {
  q: string;
  a: string;
}

export interface Game {
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  description: string[]; // paragraphs
  categories: GameCategory[];
  badge?: string; // e.g. "NEW UPDATE", "MOST POPULAR"
  /** Steam header image (or undefined → styled gradient fallback) */
  image?: string;
  accent: string; // hex accent used for the game card glow
  pricingUnit: "slot" | "gb";
  pricePerUnit: number; // USD / month
  slotOptions: number[]; // or GB options when pricingUnit === "gb"
  defaultSlots: number;
  features: { title: string; body: string }[];
  guides: string[];
  faq: GameFaq[];
}

const steam = (appId: number) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

export const GAMES: Game[] = [
  {
    slug: "minecraft",
    name: "Minecraft",
    tagline: "Java & Bedrock servers with one-click modpacks, plugins, and instant setup.",
    shortDescription:
      "The world's best-selling game, hosted on NVMe hardware with one-click modpack installs.",
    description: [
      "Minecraft remains the definitive sandbox experience — building, exploring, and surviving in procedurally generated worlds, alone or with hundreds of friends. Whether you're running a small SMP for your community, a heavily modded Forge or Fabric pack, or a large public network on Paper or Purpur, the server you host on matters.",
      "HyperNode Minecraft servers run on high-clock-speed CPUs with NVMe storage, which is exactly what Minecraft's single-threaded world engine needs. Install any modpack from CurseForge with one click, swap between Java and Bedrock, and manage plugins, worlds, and backups from a panel that stays out of your way.",
    ],
    categories: ["popular", "sandbox"],
    badge: "MOST POPULAR",
    accent: "#34D399",
    pricingUnit: "gb",
    pricePerUnit: 3.0,
    slotOptions: [2, 4, 6, 8, 10, 12, 16],
    defaultSlots: 4,
    features: [
      { title: "One-Click Modpacks", body: "Install CurseForge, FTB, and Technic packs instantly — no FTP required." },
      { title: "Java + Bedrock", body: "Switch between editions or run Geyser for full crossplay." },
      { title: "High-Clock CPUs", body: "Minecraft is single-thread bound. Our 4.9 GHz cores keep TPS at 20." },
      { title: "Automatic Backups", body: "Scheduled off-site backups with one-click world restores." },
    ],
    guides: [
      "How to connect to your Minecraft server",
      "Installing a CurseForge modpack",
      "Setting up server operators and whitelist",
      "Importing an existing world",
      "Optimizing TPS with Paper flags",
    ],
    faq: [
      { q: "Can I switch between Java and Bedrock?", a: "Yes — you can reinstall to either edition at any time from the panel, or run Geyser to let Bedrock players join your Java server." },
      { q: "Do you support modpacks?", a: "Every major launcher is supported. Use the built-in installer for CurseForge/FTB packs or upload a custom pack via SFTP." },
      { q: "How much RAM do I need?", a: "Vanilla runs comfortably on 2–4 GB. Modded packs typically want 6–10 GB depending on mod count. You can upgrade in place at any time." },
      { q: "Can I import my existing world?", a: "Yes. Upload your world folder through the file manager or SFTP and point the server at it — our wiki has a step-by-step guide." },
      { q: "Is there a player limit?", a: "No artificial slot caps on Minecraft — set max players yourself. RAM is the practical limit." },
      { q: "Do you provide DDoS protection?", a: "Always. Every HyperNode server sits behind multi-terabit DDoS mitigation at no extra cost." },
    ],
  },
  {
    slug: "rust",
    name: "Rust",
    tagline: "Wipe-ready Rust servers with Oxide/Carbon support and blazing performance.",
    shortDescription:
      "High-pop-ready Rust hosting with plugin support, scheduled wipes, and premium hardware.",
    description: [
      "Rust is the ultimate test of survival — gather, build, raid, and defend against everyone else on the island. Server quality makes or breaks the experience: entity-heavy late-wipe maps and 100+ player counts demand serious single-thread performance and fast storage.",
      "HyperNode Rust servers are tuned for exactly that. Run Oxide or Carbon plugins, schedule map and blueprint wipes, generate custom maps, and keep your community online through forced wipe day with hardware that doesn't blink.",
    ],
    categories: ["popular", "survival"],
    badge: "WIPE READY",
    image: steam(252490),
    accent: "#F87171",
    pricingUnit: "slot",
    pricePerUnit: 0.55,
    slotOptions: [50, 75, 100, 150, 200, 250, 300],
    defaultSlots: 100,
    features: [
      { title: "Oxide & Carbon", body: "One-click modding framework installs with automatic updates." },
      { title: "Wipe Scheduling", body: "Automate map and BP wipes with cron-style schedules." },
      { title: "Custom Maps", body: "Upload custom maps or use procedural generation with your seed." },
      { title: "High-Pop Hardware", body: "4.9 GHz cores and NVMe keep 200+ pop servers smooth." },
    ],
    guides: [
      "Connecting to your Rust server",
      "Installing Oxide plugins",
      "Setting up automated wipes",
      "Adding admins and moderators",
      "Custom map installation",
    ],
    faq: [
      { q: "How many slots do I need?", a: "Community servers typically run 50–150. If you're building a high-pop server, start at 200 — you can scale up or down anytime." },
      { q: "Do you support Oxide and Carbon?", a: "Both. Install either framework from the mod manager and plugins auto-load from the panel file manager." },
      { q: "Can I schedule wipes?", a: "Yes — the panel's scheduler can wipe map, blueprints, or both on any cadence, including forced wipe Thursdays." },
      { q: "Will my server survive forced wipe day?", a: "Update day traffic is business as usual. Servers auto-update as soon as Facepunch ships the build." },
      { q: "Can I run a modded + vanilla pair?", a: "Yes, order two servers and manage both from one dashboard." },
    ],
  },
  {
    slug: "palworld",
    name: "Palworld",
    tagline: "1.0-ready Palworld servers with full crossplay and instant setup.",
    shortDescription:
      "Dedicated Palworld hosting with crossplay, mod support, and 24/7 persistence.",
    categories: ["popular", "survival"],
    badge: "1.0 UPDATE",
    image: steam(1623730),
    accent: "#38BDF8",
    pricingUnit: "slot",
    pricePerUnit: 1.25,
    slotOptions: [4, 8, 12, 16, 20, 24, 32],
    defaultSlots: 8,
    description: [
      "Palworld blends open-world survival with creature collection — capture, breed, and put Pals to work while you build bases and take on raid bosses. The 1.0 release brought full crossplay across Steam, Xbox, and PlayStation, making a dedicated server the only way to keep a persistent world running for friends on every platform.",
      "HyperNode Palworld servers deploy in minutes with crossplay pre-configured. Tune every world setting from the panel, install mods, and let your world run 24/7 whether or not the host is online — no more borrowed co-op sessions that vanish when someone logs off.",
    ],
    features: [
      { title: "Full Crossplay", body: "Steam, Xbox, and PS5 players in one world, pre-configured." },
      { title: "World Settings Editor", body: "Every PalWorldSettings.ini option editable from the panel." },
      { title: "Mod Support", body: "Install mods via the built-in manager or manual upload." },
      { title: "24/7 Persistence", body: "Your bases keep producing while everyone's offline." },
    ],
    guides: [
      "Connecting to your Palworld server",
      "Editing world settings",
      "Enabling crossplay",
      "Importing a co-op save",
      "Scheduling automatic restarts",
    ],
    faq: [
      { q: "Does crossplay work on a dedicated server?", a: "Yes — since the 1.0 update, dedicated servers support Steam, Xbox, and PlayStation crossplay. We enable it by default." },
      { q: "Can I import my co-op save?", a: "Yes, upload your save through the file manager and follow our migration guide to convert host-based saves." },
      { q: "How many players can join?", a: "The engine supports up to 32 players; 8–16 is the sweet spot for base-heavy worlds." },
      { q: "Can I change day/night speed, spawn rates, etc.?", a: "Every setting in PalWorldSettings.ini is editable through our visual config editor." },
      { q: "Are mods supported?", a: "Yes, both via our mod manager and manual installation." },
    ],
  },
  {
    slug: "ark-survival-evolved",
    name: "ARK: Survival Evolved",
    tagline: "Tame the island on hardware that keeps up with 500 dinos on aggro.",
    shortDescription:
      "ARK hosting with full mod/map support, clustering, and automated updates.",
    categories: ["survival"],
    image: steam(346110),
    accent: "#FBBF24",
    pricingUnit: "slot",
    pricePerUnit: 0.35,
    slotOptions: [10, 20, 30, 50, 70, 100],
    defaultSlots: 20,
    description: [
      "ARK: Survival Evolved throws you onto an island ruled by dinosaurs — tame them, breed them, and build tribes that span every map in the franchise. ARK is famously heavy: big bases, bred dino armies, and Steam Workshop mods punish weak hardware.",
      "HyperNode ARK servers ship with every official and community map, full Workshop mod support, and cross-server clustering so your tribe can transfer between The Island, Ragnarok, and beyond. Automated updates keep you patched the moment Wildcard ships.",
    ],
    features: [
      { title: "All Maps Included", body: "Every official and community map, switchable from the panel." },
      { title: "Cluster Support", body: "Link multiple servers into one travel-enabled cluster." },
      { title: "Workshop Mods", body: "Steam Workshop mod installer with automatic updates." },
      { title: "Config Editor", body: "GameUserSettings.ini and Game.ini editable visually." },
    ],
    guides: [
      "Connecting to your ARK server",
      "Installing Steam Workshop mods",
      "Setting up a cluster",
      "Adjusting taming and harvesting rates",
      "Enabling crossplay with Epic players",
    ],
    faq: [
      { q: "Can I run boosted rates?", a: "Yes — taming, XP, harvesting, breeding and every other multiplier is editable from the config editor." },
      { q: "Do you support clustering?", a: "Yes, order multiple ARK servers and link them into a cluster with shared tribe data." },
      { q: "Which maps are available?", a: "All of them — The Island, Scorched Earth, Aberration, Extinction, Genesis 1/2, Ragnarok, Valguero, Crystal Isles, Fjordur, and Lost Island." },
      { q: "Are mods supported?", a: "Full Steam Workshop support with automatic mod updates on restart." },
    ],
  },
  {
    slug: "valheim",
    name: "Valheim",
    tagline: "Sail the tenth world with friends on always-online Viking servers.",
    shortDescription:
      "Valheim hosting with mod support (BepInEx), world uploads, and automatic backups.",
    categories: ["popular", "survival"],
    image: steam(892970),
    accent: "#A78BFA",
    pricingUnit: "slot",
    pricePerUnit: 1.0,
    slotOptions: [10],
    defaultSlots: 10,
    description: [
      "Valheim drops your Viking into a procedurally generated purgatory where every biome hides a new boss and a new way to die. A dedicated server keeps your world alive around the clock, so your clan can build, sail, and raid on their own schedules.",
      "HyperNode Valheim servers support BepInEx modding (Valheim Plus and friends), world uploads from local co-op saves, and automatic off-site backups so a corrupted world never costs you your longhouse.",
    ],
    features: [
      { title: "BepInEx Modding", body: "Valheim Plus and the full BepInEx ecosystem, one click away." },
      { title: "World Import", body: "Upload your local world and keep playing where you left off." },
      { title: "Crossplay Toggle", body: "Enable Xbox/PC crossplay with a single panel switch." },
      { title: "Auto Backups", body: "Scheduled world backups with instant restores." },
    ],
    guides: [
      "Connecting to your Valheim server",
      "Uploading an existing world",
      "Installing Valheim Plus",
      "Enabling crossplay",
      "Managing the allow-list",
    ],
    faq: [
      { q: "How many players does Valheim support?", a: "The engine caps at 10 players, which is why our plan is a flat 10 slots." },
      { q: "Can I upload my existing world?", a: "Yes — upload the .db and .fwl files through the file manager and restart." },
      { q: "Are mods supported?", a: "Yes, BepInEx installs from the mod manager; drop plugins into the BepInEx folder after that." },
      { q: "Does crossplay work?", a: "Yes, toggle the crossplay flag in the panel and Xbox players can join." },
    ],
  },
  {
    slug: "project-zomboid",
    name: "Project Zomboid",
    tagline: "This is how you survived. Persistent Knox Country for your whole group.",
    shortDescription:
      "Project Zomboid hosting with Workshop mods, B42 support, and painless soft resets.",
    categories: ["survival"],
    badge: "B42 SUPPORT",
    image: steam(108600),
    accent: "#F87171",
    pricingUnit: "slot",
    pricePerUnit: 0.9,
    slotOptions: [4, 8, 12, 16, 24, 32],
    defaultSlots: 8,
    description: [
      "Project Zomboid is the deepest zombie survival sim ever made — and multiplayer Knox Country is where it shines. A dedicated server means the world keeps its state: barricades hold, crops grow, and the horde keeps shambling whether or not anyone's online.",
      "HyperNode Zomboid servers handle Steam Workshop mod collections gracefully, support Build 41 and Build 42 branches, and make sandbox tuning, soft resets, and admin management simple through the panel.",
    ],
    features: [
      { title: "Workshop Collections", body: "Paste a collection ID and mods sync automatically." },
      { title: "Branch Switching", body: "Run stable B41 or opt into B42 beta from the panel." },
      { title: "Sandbox Editor", body: "Every sandbox variable editable without touching files." },
      { title: "Safe Soft Resets", body: "Wipe the world, keep player data — one click." },
    ],
    guides: [
      "Connecting to your Zomboid server",
      "Adding Workshop mods and collections",
      "Making yourself admin",
      "Tuning sandbox settings",
      "Performing a soft reset",
    ],
    faq: [
      { q: "How do mods work?", a: "Add Workshop IDs (or a whole collection) in the panel; the server downloads and syncs them to joining players automatically." },
      { q: "Can I run Build 42?", a: "Yes, switch branches from the panel. Note B42 multiplayer is still in beta per the developers." },
      { q: "How many slots should I get?", a: "Most private groups run 4–12. Public RP servers commonly run 24–32." },
      { q: "Can I migrate an existing server?", a: "Yes, upload your Zomboid save folder and our guide walks you through remapping it." },
    ],
  },
  {
    slug: "7-days-to-die",
    name: "7 Days to Die",
    tagline: "Survive the horde night — every seventh night, on your own terms.",
    shortDescription:
      "7DTD hosting with 1.0 support, Darkness Falls and overhaul mod compatibility.",
    categories: ["survival"],
    image: steam(251570),
    accent: "#FB923C",
    pricingUnit: "slot",
    pricePerUnit: 0.55,
    slotOptions: [8, 12, 16, 24, 32],
    defaultSlots: 8,
    description: [
      "7 Days to Die fuses tower defense, crafting, and open-world survival into one relentless loop: loot, build, and fortify before the blood moon horde arrives. Dedicated hosting keeps your fort standing and your loot respawning on a world that never pauses.",
      "HyperNode 7DTD servers support the 1.0 release and the big overhaul mods — Darkness Falls, Undead Legacy, War3zuk — plus full serverconfig.xml editing and scheduled restarts to keep memory in check on long-running maps.",
    ],
    features: [
      { title: "Overhaul Mod Ready", body: "Darkness Falls and friends install cleanly via the file manager." },
      { title: "Config Editor", body: "Full serverconfig.xml control from the panel." },
      { title: "Scheduled Restarts", body: "Keep long-running worlds fresh with automated restarts." },
      { title: "Map Choice", body: "Navezgane or random-gen worlds with your seed." },
    ],
    guides: [
      "Connecting to your 7DTD server",
      "Installing Darkness Falls",
      "Editing serverconfig.xml",
      "Adding admins",
      "Scheduling restarts",
    ],
    faq: [
      { q: "Does the server support 1.0?", a: "Yes, and you can pin older versions or opt into experimental branches from the panel." },
      { q: "Can I run overhaul mods?", a: "Yes — server-side overhauls like Darkness Falls work great; clients install the matching mod via their launcher." },
      { q: "How many slots do I need?", a: "8–16 covers most groups. Horde night is CPU-heavy, and our high-clock cores keep it smooth." },
    ],
  },
  {
    slug: "enshrouded",
    name: "Enshrouded",
    tagline: "Flameborn rise — voxel-built kingdoms beyond the Shroud, hosted 24/7.",
    shortDescription:
      "Enshrouded hosting with full world config, instant setup, and NVMe performance.",
    categories: ["popular", "survival"],
    badge: "NEW UPDATE",
    image: steam(1203620),
    accent: "#38BDF8",
    pricingUnit: "slot",
    pricePerUnit: 2.25,
    slotOptions: [4, 8, 12, 16],
    defaultSlots: 8,
    description: [
      "Enshrouded pairs voxel building with soulslike combat across a vast fantasy realm consumed by the Shroud. A dedicated server keeps your flame lit for up to 16 players with fully persistent bases and progression.",
      "HyperNode Enshrouded servers deploy instantly with editable world settings — enemy difficulty, resource rates, day length — and run on NVMe hardware that handles the game's aggressive terrain streaming without hitching.",
    ],
    features: [
      { title: "World Settings", body: "Difficulty, loot, and progression sliders from the panel." },
      { title: "Instant Deploy", body: "Server online in under five minutes from checkout." },
      { title: "Save Import", body: "Bring your co-op world with you." },
      { title: "NVMe Streaming", body: "Terrain streams from NVMe — no rubber-banding." },
    ],
    guides: [
      "Connecting to your Enshrouded server",
      "Editing world settings",
      "Importing a co-op save",
      "Managing player permissions",
    ],
    faq: [
      { q: "How many players can join?", a: "Enshrouded supports up to 16 players on a dedicated server." },
      { q: "Can I adjust difficulty?", a: "Yes, the full world config (combat, resources, day cycle) is exposed in the panel editor." },
      { q: "Can I move my co-op save to the server?", a: "Yes, upload the save via file manager — our wiki has the exact paths." },
    ],
  },
  {
    slug: "satisfactory",
    name: "Satisfactory",
    tagline: "The factory must grow — dedicated servers for 1.0 mega-factories.",
    shortDescription:
      "Satisfactory 1.0 hosting tuned for mega-factory late game and always-on production.",
    categories: ["sandbox"],
    image: steam(526870),
    accent: "#FB923C",
    pricingUnit: "slot",
    pricePerUnit: 1.3,
    slotOptions: [4, 6, 8, 12],
    defaultSlots: 4,
    description: [
      "Satisfactory's 1.0 release made FICSIT's factory sim complete — and dedicated servers mean the belts keep moving while you sleep. Build planet-spanning factories with friends without anyone hosting from their gaming rig.",
      "Late-game saves with hundreds of thousands of entities are brutal on weak servers. HyperNode runs Satisfactory on high-frequency cores with generous RAM so your mega-factory ticks smoothly at any scale.",
    ],
    features: [
      { title: "1.0 Ready", body: "Always current with Coffee Stain's release builds." },
      { title: "Mega-Factory Hardware", body: "High-clock CPUs handle six-figure entity counts." },
      { title: "Save Management", body: "Upload, download, and roll back factory saves freely." },
      { title: "Always-On Production", body: "Factories produce 24/7, even with nobody online." },
    ],
    guides: [
      "Connecting to your Satisfactory server",
      "Claiming your server and setting admin password",
      "Uploading an existing save",
      "Automatic restarts and backups",
    ],
    faq: [
      { q: "How many players are supported?", a: "The default is 4, and it can be raised via config — 8–12 works well on our hardware." },
      { q: "Can I upload my existing world?", a: "Yes, claim the server then upload your save through the server manager or our file manager." },
      { q: "Does the factory run while we're offline?", a: "Yes — that's the main benefit of a dedicated server. Production continues around the clock." },
    ],
  },
  {
    slug: "terraria",
    name: "Terraria",
    tagline: "Dig, fight, build — TShock-powered Terraria worlds that never sleep.",
    shortDescription:
      "Terraria hosting with vanilla, TShock, and tModLoader support out of the box.",
    categories: ["sandbox"],
    image: steam(105600),
    accent: "#34D399",
    pricingUnit: "slot",
    pricePerUnit: 0.4,
    slotOptions: [8, 12, 16, 24],
    defaultSlots: 8,
    description: [
      "Terraria's 2D world hides absurd depth — hundreds of bosses, biomes, and building materials. Host a persistent world where your whole crew can dig, fight, and build without passing around save files.",
      "HyperNode Terraria servers support vanilla, TShock (with its permission and plugin ecosystem), and tModLoader for Calamity, Thorium, and beyond. Swap between them anytime.",
    ],
    features: [
      { title: "TShock Included", body: "Permissions, anti-grief, and plugins with one click." },
      { title: "tModLoader", body: "Run Calamity and friends with full mod sync." },
      { title: "World Uploads", body: "Bring existing .wld files with you." },
      { title: "Featherweight Pricing", body: "Terraria is light — our plans price accordingly." },
    ],
    guides: [
      "Connecting to your Terraria server",
      "Setting up TShock permissions",
      "Installing tModLoader mods",
      "Uploading an existing world",
    ],
    faq: [
      { q: "Vanilla, TShock, or tModLoader?", a: "All three are available as one-click installs; you can switch whenever you like." },
      { q: "Can I use my existing world?", a: "Yes, upload the .wld file through the file manager." },
      { q: "How many slots?", a: "8 covers most groups; TShock servers with events often run 16–24." },
    ],
  },
  {
    slug: "v-rising",
    name: "V Rising",
    tagline: "Raise your castle, rule the night — persistent Vardoran for your clan.",
    shortDescription:
      "V Rising hosting with full ServerGameSettings control and castle-safe backups.",
    categories: ["survival"],
    image: steam(1604030),
    accent: "#F87171",
    pricingUnit: "slot",
    pricePerUnit: 0.45,
    slotOptions: [10, 20, 30, 40, 60],
    defaultSlots: 20,
    description: [
      "V Rising casts you as a vampire rebuilding your empire — hunt blood, raise a castle, and wage war under a sun that wants you dead. PvP raid windows and clan politics only work properly on a dedicated server with real uptime.",
      "HyperNode V Rising servers expose the complete ServerGameSettings.json — raid schedules, loot rates, clan sizes, castle limits — through a visual editor, with automated backups protecting years of castle-building from a single bad raid... or bad patch.",
    ],
    features: [
      { title: "Full Settings Control", body: "Every game setting editable from the panel." },
      { title: "Raid Scheduling", body: "Define PvP windows that match your community's timezone." },
      { title: "Castle-Safe Backups", body: "Automatic backups before every restart and update." },
      { title: "PvE ↔ PvP Modes", body: "Switch rulesets without rebuilding the world." },
    ],
    guides: [
      "Connecting to your V Rising server",
      "Editing game settings",
      "Setting raid windows",
      "Becoming admin and using console commands",
    ],
    faq: [
      { q: "Can I configure raid times?", a: "Yes — castle siege windows are fully configurable per weekday." },
      { q: "PvE or PvP?", a: "Both presets are available, plus fully custom rulesets." },
      { q: "How many slots?", a: "Duo/clan PvE runs fine at 10–20; competitive PvP servers usually want 40+." },
    ],
  },
  {
    slug: "sons-of-the-forest",
    name: "Sons of the Forest",
    tagline: "Survive the island's horrors together — with Kelvin doing the chores.",
    shortDescription:
      "Sons of the Forest hosting with instant setup and full config control.",
    categories: ["survival"],
    image: steam(1326470),
    accent: "#34D399",
    pricingUnit: "slot",
    pricePerUnit: 1.75,
    slotOptions: [4, 8],
    defaultSlots: 8,
    description: [
      "Sons of the Forest strands you on a cannibal-infested island with a lot of rope, a log or two, and questionable AI companions. Dedicated servers keep your base, story progress, and traps persistent for up to 8 players.",
      "HyperNode servers deploy in minutes with editable dedicatedserver.cfg, automated saves, and enough headroom for the game's demanding late-game bases.",
    ],
    features: [
      { title: "Instant Setup", body: "From checkout to island in under five minutes." },
      { title: "Config Control", body: "All server settings editable in the panel." },
      { title: "Save Persistence", body: "Story and structure progress saved server-side." },
      { title: "Auto Updates", body: "Patches applied the moment Endnight releases them." },
    ],
    guides: [
      "Connecting to your server",
      "Editing server configuration",
      "Managing saves",
    ],
    faq: [
      { q: "How many players?", a: "Dedicated servers support up to 8 players." },
      { q: "Can we continue our co-op save?", a: "Yes, upload it via the file manager following our migration guide." },
    ],
  },
  {
    slug: "factorio",
    name: "Factorio",
    tagline: "Launch the rocket together — UPS-stable megabase hosting.",
    shortDescription:
      "Factorio hosting with mod sync, Space Age support, and UPS-stable hardware.",
    categories: ["sandbox"],
    image: steam(427520),
    accent: "#FBBF24",
    pricingUnit: "slot",
    pricePerUnit: 0.5,
    slotOptions: [4, 8, 16, 32],
    defaultSlots: 8,
    description: [
      "Factorio is the purest factory game ever made, and its multiplayer is engineering bliss — until the host's UPS tanks. A dedicated server with serious single-thread performance keeps 60 UPS alive deep into megabase territory.",
      "HyperNode Factorio servers support the Space Age expansion, sync mods automatically to joining players, and expose map-gen and server settings through the panel.",
    ],
    features: [
      { title: "Space Age Ready", body: "Run the expansion and its mod ecosystem day one." },
      { title: "Mod Sync", body: "Players auto-download the server's mod list on join." },
      { title: "60 UPS Hardware", body: "High-clock cores built for megabase math." },
      { title: "Headless Saves", body: "Upload/download saves and autosave on your schedule." },
    ],
    guides: [
      "Connecting to your Factorio server",
      "Installing mods",
      "Uploading an existing save",
      "Admin commands and permissions",
    ],
    faq: [
      { q: "Does it support Space Age?", a: "Yes — enable the expansion mods from the panel (players need to own the expansion)." },
      { q: "Can I upload my save?", a: "Yes, drop the .zip save in via file manager and select it as the active save." },
      { q: "What about UPS at scale?", a: "Factorio is single-thread bound; our 4.9 GHz cores are about as good as it gets for megabases." },
    ],
  },
  {
    slug: "dayz",
    name: "DayZ",
    tagline: "Chernarus, your rules — modded DayZ servers with real performance.",
    shortDescription:
      "DayZ hosting with Workshop mods, custom missions, and enterprise DDoS protection.",
    categories: ["popular", "survival"],
    image: steam(221100),
    accent: "#A78BFA",
    pricingUnit: "slot",
    pricePerUnit: 0.9,
    slotOptions: [10, 20, 30, 40, 60, 80, 100],
    defaultSlots: 40,
    description: [
      "DayZ is the survival shooter that started it all — a brutal, persistent Chernarus where every encounter might be your last. Community servers are DayZ's beating heart, from hardcore vanilla to heavily modded RP worlds.",
      "HyperNode DayZ servers handle big mod stacks (Expansion, Trader, custom maps) with fast NVMe load times, full mission file access, and DDoS protection that keeps grief off your doorstep.",
    ],
    features: [
      { title: "Workshop Mods", body: "Full Steam Workshop support with load-order control." },
      { title: "Mission File Access", body: "Complete access to init.c and mission internals." },
      { title: "Custom Maps", body: "Namalsk, Deer Isle, Banov — run any community map." },
      { title: "Serious DDoS Shield", body: "Multi-terabit filtering tuned for game traffic." },
    ],
    guides: [
      "Connecting to your DayZ server",
      "Installing Workshop mods",
      "Editing mission files",
      "Setting up Trader and Expansion",
    ],
    faq: [
      { q: "Can I run custom maps?", a: "Yes — any Workshop map works; our guide covers the mission swap." },
      { q: "How many mods can I run?", a: "As many as your players will download. NVMe keeps even 30+ mod servers loading fast." },
      { q: "Do you wipe my server?", a: "Never. Your world persists until you choose to wipe it." },
    ],
  },
  {
    slug: "counter-strike-2",
    name: "Counter-Strike 2",
    tagline: "128-tick community servers for scrims, retakes, and surf.",
    shortDescription:
      "CS2 hosting with SourceMod-style plugins, workshop maps, and low-latency routing.",
    categories: ["fps", "popular"],
    image: steam(730),
    accent: "#FBBF24",
    pricingUnit: "slot",
    pricePerUnit: 0.5,
    slotOptions: [12, 16, 24, 32, 64],
    defaultSlots: 16,
    description: [
      "Counter-Strike 2 moved the world's biggest FPS onto Source 2 — and community servers remain where the game's culture lives: retakes, surf, KZ, and scrim servers with rules the matchmaking queue will never give you.",
      "HyperNode CS2 servers run on low-latency routes with premium peering, support CounterStrikeSharp plugins and workshop map collections, and give you full console access for match configs.",
    ],
    features: [
      { title: "CounterStrikeSharp", body: "The modern plugin framework, pre-installable from the panel." },
      { title: "Workshop Maps", body: "Host surf, KZ, and community map collections." },
      { title: "Low-Latency Network", body: "Premium peering keeps your rates clean." },
      { title: "Match Configs", body: "Full RCON and config file access for scrims." },
    ],
    guides: [
      "Connecting to your CS2 server",
      "Installing CounterStrikeSharp",
      "Adding workshop maps",
      "Setting up a practice/scrim config",
    ],
    faq: [
      { q: "Are plugins supported?", a: "Yes — CounterStrikeSharp and Metamod install from the panel; classic SourceMod does not support CS2." },
      { q: "Can I run workshop maps?", a: "Yes, host collections via the workshop settings in the panel." },
      { q: "What tick rate do servers run?", a: "CS2 uses sub-tick; our high-clock CPUs keep sub-tick simulation smooth even at 64 players." },
    ],
  },
  {
    slug: "garrys-mod",
    name: "Garry's Mod",
    tagline: "DarkRP, TTT, sandbox — the platform that never dies, hosted right.",
    shortDescription:
      "GMod hosting with instant gamemode installs, Workshop collections, and FastDL.",
    categories: ["sandbox", "fps"],
    image: steam(4000),
    accent: "#38BDF8",
    pricingUnit: "slot",
    pricePerUnit: 0.5,
    slotOptions: [12, 16, 24, 32, 64, 128],
    defaultSlots: 24,
    description: [
      "Garry's Mod is two decades old and still one of the most-played games on Steam — because communities keep reinventing it. DarkRP cities, TTT nights with friends, or pure sandbox chaos all need a server that can load a thousand addons without falling over.",
      "HyperNode GMod servers offer one-click gamemode installs, Workshop collection sync, and NVMe storage that makes even addon-heavy DarkRP servers load fast.",
    ],
    features: [
      { title: "Gamemode Installer", body: "DarkRP, TTT, Prop Hunt, and more — one click." },
      { title: "Workshop Collections", body: "Paste a collection ID; addons sync automatically." },
      { title: "Addon-Heavy Ready", body: "NVMe + high clocks for 1,000-addon servers." },
      { title: "MySQL Included", body: "Free database for DarkRP data and bans." },
    ],
    guides: [
      "Connecting to your GMod server",
      "Installing DarkRP",
      "Setting up a Workshop collection",
      "Configuring FastDL",
      "Adding admins with ULX",
    ],
    faq: [
      { q: "Which gamemodes are supported?", a: "All of them — popular ones are one-click installs, everything else installs via Workshop or file manager." },
      { q: "How do players download my addons?", a: "Link a Workshop collection and clients download automatically on join." },
      { q: "Do I get a database?", a: "Yes, every GMod plan includes a MySQL database for DarkRP and admin mods." },
    ],
  },
];

export function getGame(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export const GAME_CATEGORIES: { id: GameCategory | "all"; label: string }[] = [
  { id: "all", label: "All Games" },
  { id: "popular", label: "Popular" },
  { id: "survival", label: "Survival" },
  { id: "fps", label: "FPS" },
  { id: "sandbox", label: "Sandbox" },
];

export function priceFor(game: Game, units: number): number {
  return Math.round(game.pricePerUnit * units * 100) / 100;
}

export function startingPrice(game: Game): number {
  return priceFor(game, game.slotOptions[0]);
}
