/**
 * Downloads per-game artwork into public/games/{slug}/.
 *
 * Sources:
 *  - Steam CDN store assets (hero / header / portrait)
 *  - Steam storefront API (screenshots)
 *  - Official Mojang media for Minecraft (not on Steam)
 *
 * Usage: npm run fetch-assets [-- --force]
 * Existing files are skipped unless --force is passed.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const FORCE = process.argv.includes("--force");
const OUT_ROOT = path.join(process.cwd(), "public", "games");

/** slug -> Steam appId (must match src/content/games.ts) */
const STEAM_GAMES = {
  rust: 252490,
  palworld: 1623730,
  "ark-survival-evolved": 346110,
  valheim: 892970,
  "project-zomboid": 108600,
  "7-days-to-die": 251570,
  enshrouded: 1203620,
  satisfactory: 526870,
  terraria: 105600,
  "v-rising": 1604030,
  "sons-of-the-forest": 1326470,
  factorio: 427520,
  dayz: 221100,
  "counter-strike-2": 730,
  "garrys-mod": 4000,
};

/** Official Mojang press/media art for Minecraft (candidate URLs, first that works wins). */
const MC = "https://www.minecraft.net/content/dam/minecraftnet/games/minecraft";
const MINECRAFT_ASSETS = {
  "hero.jpg": [
    `${MC}/key-art/MCV_SummerDrop_Hero_DotNet_Blog_Editorial_1280x768.jpg`,
    `${MC}/key-art/Minecraft_TheGardenAwakens_DotNet_1280x768.jpg`,
  ],
  "capsule.jpg": [
    `${MC}/key-art/Downloads_Box-Art_Vanilla_600x337%402x.jpg`,
    `${MC}/key-art/Vanilla-PMP_Carousel-Card_SGD-26_1280x720.jpg`,
  ],
  "portrait.jpg": [
    `${MC}/game-characters/MC-About_Key-Art_Build_Amazing_Things_600x800.png`,
  ],
  "screenshot-1.jpg": [`${MC}/screenshots/CREATE_BuildAlmostAnything.png`],
  "screenshot-2.jpg": [
    `${MC}/screenshots/EXPLORE_PDPScreenshotRefresh2024_multipleBiomes_01.png`,
  ],
  "screenshot-3.jpg": [`${MC}/screenshots/SURVIVE.png`],
  "screenshot-4.jpg": [
    `${MC}/screenshots/PLAYTOGETHERPDPScreenshotRefresh2024_exitingPortal_01.png`,
  ],
};

const cdn = (appId, file) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/${file}`;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** Download the first working URL to dest. Returns true on success. */
async function download(urls, dest) {
  if (!FORCE && (await exists(dest))) return true;
  for (const url of [].concat(urls)) {
    try {
      const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5_000) continue; // ignore placeholder/error images
      await writeFile(dest, buf);
      return true;
    } catch {
      /* try next candidate */
    }
  }
  return false;
}

async function fetchScreenshotUrls(appId) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`,
      { headers: HEADERS },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const shots = json?.[appId]?.data?.screenshots ?? [];
    return shots.slice(0, 4).map((s) => s.path_full);
  } catch {
    return [];
  }
}

async function fetchSteamGame(slug, appId) {
  const dir = path.join(OUT_ROOT, slug);
  await mkdir(dir, { recursive: true });
  const results = [];

  results.push([
    "hero.jpg",
    await download(
      [cdn(appId, "library_hero.jpg"), cdn(appId, "header.jpg")],
      path.join(dir, "hero.jpg"),
    ),
  ]);
  results.push([
    "capsule.jpg",
    await download([cdn(appId, "header.jpg")], path.join(dir, "capsule.jpg")),
  ]);
  results.push([
    "portrait.jpg",
    await download(
      [cdn(appId, "library_600x900_2x.jpg"), cdn(appId, "library_600x900.jpg")],
      path.join(dir, "portrait.jpg"),
    ),
  ]);

  const shots = await fetchScreenshotUrls(appId);
  for (let i = 0; i < shots.length; i++) {
    results.push([
      `screenshot-${i + 1}.jpg`,
      await download([shots[i]], path.join(dir, `screenshot-${i + 1}.jpg`)),
    ]);
  }
  if (!shots.length) results.push(["screenshots", false]);

  return results;
}

async function fetchMinecraft() {
  const dir = path.join(OUT_ROOT, "minecraft");
  await mkdir(dir, { recursive: true });
  const results = [];
  for (const [file, urls] of Object.entries(MINECRAFT_ASSETS)) {
    results.push([file, await download(urls, path.join(dir, file))]);
  }
  return results;
}

const failures = [];

for (const [slug, appId] of Object.entries(STEAM_GAMES)) {
  const results = await fetchSteamGame(slug, appId);
  const failed = results.filter(([, ok]) => !ok).map(([f]) => f);
  console.log(
    `${slug.padEnd(22)} ${results.length - failed.length}/${results.length} ok${failed.length ? `  MISSING: ${failed.join(", ")}` : ""}`,
  );
  if (failed.length) failures.push([slug, failed]);
}

{
  const results = await fetchMinecraft();
  const failed = results.filter(([, ok]) => !ok).map(([f]) => f);
  console.log(
    `${"minecraft".padEnd(22)} ${results.length - failed.length}/${results.length} ok${failed.length ? `  MISSING: ${failed.join(", ")}` : ""}`,
  );
  if (failed.length) failures.push(["minecraft", failed]);
}

if (failures.length) {
  console.log("\nSome assets could not be downloaded:");
  for (const [slug, files] of failures) console.log(`  ${slug}: ${files.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nAll assets downloaded.");
}
