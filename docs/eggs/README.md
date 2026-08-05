# Pterodactyl egg definitions

Egg JSON imported into the HyperNode panel, kept here so the panel's
Minecraft software list is reproducible.

| File | Egg on panel | Source |
| --- | --- | --- |
| `egg-purpur.json` | Purpur | [pelican-eggs/minecraft](https://github.com/pelican-eggs/minecraft) `java/purpur` |
| `egg-fabric.json` | Fabric | [pelican-eggs/minecraft](https://github.com/pelican-eggs/minecraft) `java/fabric` |

Both were modified from upstream before import:

- `docker_images` repointed from `ghcr.io/pelican-eggs/yolks` to
  `ghcr.io/pterodactyl/yolks`, matching the panel's existing eggs. Without this
  the installer cannot preserve a customer's chosen Java version when switching
  software, and servers fall back to the egg default.
- Images reordered newest-first so the imported default is Java 25, not Java 8.
- Install container aligned with the panel's other Minecraft eggs.

Import via **Admin → Nests → Import Egg**, associating with the Minecraft nest.
`src/lib/minecraftInstaller.ts` finds eggs by name, so an egg must exist on the
panel before its software can install durably; without one the installer falls
back to downloading the jar, which a later reinstall reverts.
