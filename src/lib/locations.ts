import { pteroApp, pteroConfigured } from "@/lib/pterodactyl";

export interface DisplayLocation {
  id: number;
  short: string;
  long: string;
  region: "North America" | "Europe" | "Asia Pacific" | "Other";
}

// Shown when the Pterodactyl panel isn't reachable/configured yet.
const FALLBACK: DisplayLocation[] = [
  { id: -1, short: "us-dal", long: "Dallas, TX", region: "North America" },
  { id: -2, short: "us-nyc", long: "New York, NY", region: "North America" },
  { id: -3, short: "eu-fra", long: "Frankfurt, DE", region: "Europe" },
];

function inferRegion(text: string): DisplayLocation["region"] {
  const t = text.toLowerCase();
  if (/(us|usa|america|dallas|york|miami|chicago|angeles|seattle|atlanta|montreal|canada|ca-)/.test(t))
    return "North America";
  if (/(eu|europe|london|amsterdam|frankfurt|nuremberg|paris|uk|de-|nl-|fr-)/.test(t))
    return "Europe";
  if (/(ap|asia|sydney|singapore|tokyo|au-|sg-|jp-)/.test(t)) return "Asia Pacific";
  return "Other";
}

/** Locations mirrored live from the Pterodactyl panel, with graceful fallback. */
export async function getDisplayLocations(): Promise<{
  locations: DisplayLocation[];
  live: boolean;
}> {
  if (!(await pteroConfigured())) return { locations: FALLBACK, live: false };
  try {
    const res = await pteroApp.listLocations();
    const locations = res.data.map(({ attributes: a }) => ({
      id: a.id,
      short: a.short,
      long: a.long || a.short,
      region: inferRegion(`${a.short} ${a.long ?? ""}`),
    }));
    return locations.length
      ? { locations, live: true }
      : { locations: FALLBACK, live: false };
  } catch {
    return { locations: FALLBACK, live: false };
  }
}
