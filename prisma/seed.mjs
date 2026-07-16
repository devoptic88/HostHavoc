import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Guide titles per game slug — mirrors src/content/games.ts guides lists.
const guides = {
  minecraft: [
    "How to connect to your Minecraft server",
    "Installing a CurseForge modpack",
    "Setting up server operators and whitelist",
    "Importing an existing world",
    "Optimizing TPS with Paper flags",
  ],
  rust: [
    "Connecting to your Rust server",
    "Installing Oxide plugins",
    "Setting up automated wipes",
    "Adding admins and moderators",
    "Custom map installation",
  ],
  palworld: [
    "Connecting to your Palworld server",
    "Editing world settings",
    "Enabling crossplay",
    "Importing a co-op save",
    "Scheduling automatic restarts",
  ],
  "ark-survival-evolved": [
    "Connecting to your ARK server",
    "Installing Steam Workshop mods",
    "Setting up a cluster",
    "Adjusting taming and harvesting rates",
  ],
  valheim: [
    "Connecting to your Valheim server",
    "Uploading an existing world",
    "Installing Valheim Plus",
    "Enabling crossplay",
  ],
  "project-zomboid": [
    "Connecting to your Zomboid server",
    "Adding Workshop mods and collections",
    "Making yourself admin",
    "Tuning sandbox settings",
  ],
  "7-days-to-die": [
    "Connecting to your 7DTD server",
    "Installing Darkness Falls",
    "Editing serverconfig.xml",
  ],
  enshrouded: [
    "Connecting to your Enshrouded server",
    "Editing world settings",
    "Importing a co-op save",
  ],
  satisfactory: [
    "Connecting to your Satisfactory server",
    "Claiming your server and setting admin password",
    "Uploading an existing save",
  ],
  terraria: [
    "Connecting to your Terraria server",
    "Setting up TShock permissions",
    "Installing tModLoader mods",
  ],
  "v-rising": [
    "Connecting to your V Rising server",
    "Editing game settings",
    "Setting raid windows",
  ],
  "sons-of-the-forest": [
    "Connecting to your server",
    "Editing server configuration",
  ],
  factorio: [
    "Connecting to your Factorio server",
    "Installing mods",
    "Uploading an existing save",
  ],
  dayz: [
    "Connecting to your DayZ server",
    "Installing Workshop mods",
    "Editing mission files",
  ],
  "counter-strike-2": [
    "Connecting to your CS2 server",
    "Installing CounterStrikeSharp",
    "Adding workshop maps",
  ],
  "garrys-mod": [
    "Connecting to your GMod server",
    "Installing DarkRP",
    "Setting up a Workshop collection",
  ],
};

const articleBody = (title, gameSlug) => `
## ${title}

This guide walks you through **${title.toLowerCase()}** on your HyperNode server.

### Before you start

1. Log in to your [HyperNode dashboard](/dashboard) and open the server.
2. Make sure the server has finished installing (status shows **Online** or **Offline**, not *Installing*).
3. For anything that changes files, take a quick backup from the **Backups** tab first.

### Steps

1. Open your server in the dashboard.
2. Use the **Console**, **Files**, or **Startup** tab depending on the task — every setting this guide touches is available right in the panel.
3. Apply your changes and restart the server from the header controls.

### Need a hand?

Our support team answers around the clock with a sub-10-minute median response —
[open a ticket](/dashboard/tickets) and we'll take it from there.

*This is a starter article — edit it in Admin → Wiki with the exact steps for your setup.*
`;

async function main() {
  // Blog: launch post
  await db.post.upsert({
    where: { slug: "welcome-to-hypernode" },
    update: {},
    create: {
      slug: "welcome-to-hypernode",
      title: "Welcome to HyperNode — game hosting without the drama",
      excerpt:
        "Owned Ryzen hardware, a control panel we actually like using, and DDoS protection that treats wipe day like a Tuesday. Here's what we're building.",
      body: `
## Why another host?

Because most of us have rented from "most hosts" — oversold nodes, weekend-silent ticket queues, and panels older than the games running on them.

HyperNode is the host we wanted to rent from:

- **Owned hardware.** High-frequency Ryzen CPUs, DDR5 memory, NVMe drives. No reseller roulette.
- **One fast dashboard.** Live console, file manager, mods, backups, and schedules in one place.
- **DDoS protection standard.** Multi-terabit filtering tuned for game traffic, included on every plan.
- **Humans on support.** People who run their own community servers, around the clock.

## Launch lineup

We're starting with 16 games — Minecraft, Rust, Palworld, ARK, Valheim, Project Zomboid, and more — plus Ryzen VPS and dedicated servers. New games ship weekly; if yours is missing, open a ticket and we'll usually add it within days.

**Deploy your first server in minutes → [browse games](/games)**
`,
      published: true,
    },
  });

  // Wiki: one starter article per guide title
  let count = 0;
  for (const [gameSlug, titles] of Object.entries(guides)) {
    for (const title of titles) {
      const slug = slugify(title);
      await db.article.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          category: gameSlug,
          title,
          body: articleBody(title, gameSlug),
          published: true,
        },
      });
      count++;
    }
  }

  // General articles
  for (const [title, body] of [
    [
      "Getting started with HyperNode",
      `## Welcome!\n\n1. **Pick a game** on the [games page](/games) and choose slots + location.\n2. **Check out** — servers provision automatically after payment.\n3. **Manage everything** from your [dashboard](/dashboard): console, files, mods, backups.\n\nYour server typically comes online within five minutes of checkout.`,
    ],
    [
      "How billing works",
      `## Billing basics\n\nAll plans bill monthly through Stripe. Upgrade, downgrade, or cancel anytime from **Dashboard → Billing → Manage billing**.\n\n- **72-hour money-back guarantee** on every new service.\n- Failed payments suspend (never delete) your server — data is kept for 7 days after cancellation.`,
    ],
  ]) {
    const slug = slugify(title);
    await db.article.upsert({
      where: { slug },
      update: {},
      create: { slug, category: "general", title, body, published: true },
    });
    count++;
  }

  console.log(`Seeded 1 blog post and ${count} wiki articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
