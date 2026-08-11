import { CreditCard, Database, Globe, LifeBuoy, PlugZap, ShieldCheck } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { getSettings, getSettingSources, type SettingKey } from "@/lib/settings";
import { updateSettings } from "../actions";

export const dynamic = "force-dynamic";

const SECTIONS: {
  title: string;
  icon: "panel" | "billing" | "dns" | "support" | "storage";
  description: string;
  fields: { key: SettingKey; label: string; secret: boolean; hint?: string; placeholder?: string }[];
}[] = [
  {
    title: "Pterodactyl panel",
    icon: "panel",
    description:
      "Connects HyperNode to your game panel for provisioning, console, files, and backups.",
    fields: [
      {
        key: "PTERODACTYL_URL",
        label: "Panel URL",
        secret: false,
        placeholder: "https://panel.example.com",
        hint: "Base URL of the panel, no trailing slash.",
      },
      {
        key: "PTERODACTYL_APP_API_KEY",
        label: "Application API key",
        secret: true,
        hint: "Panel → Admin → Application API. Needs full read/write.",
      },
      {
        key: "PTERODACTYL_CLIENT_API_KEY",
        label: "Client API key (service account)",
        secret: true,
        hint: "Account → API Credentials on the service account that owns provisioned servers.",
      },
    ],
  },
  {
    title: "Paymenter billing",
    icon: "billing",
    description:
      "Without these, checkout runs in dev mode and provisions orders without payment.",
    fields: [
      {
        key: "PAYMENTER_URL",
        label: "Paymenter URL",
        secret: false,
        placeholder: "https://billing.example.com",
        hint: "Base URL of your Paymenter instance, no trailing slash.",
      },
      {
        key: "PAYMENTER_API_KEY",
        label: "Admin API key",
        secret: true,
        hint: "Paymenter Admin → API. Needs read/write on users, products, and orders.",
      },
      {
        key: "PAYMENTER_EXTENSION_SECRET",
        label: "Extension shared secret",
        secret: true,
        hint: "Any random string — enter the same value in the HyperNode server extension's config on the Paymenter side.",
      },
    ],
  },
  {
    title: "Server subdomains (Cloudflare)",
    icon: "dns",
    description:
      "Gives every game server its own address, so customers share name.yourdomain instead of an IP and port. Leave blank to disable — servers then show their IP and port as before.",
    fields: [
      {
        key: "SERVER_DOMAIN",
        label: "Server domain",
        secret: false,
        placeholder: "hypernode.gg",
        hint: "Subdomains are created under this zone, e.g. survival.hypernode.gg.",
      },
      {
        key: "CLOUDFLARE_API_TOKEN",
        label: "Cloudflare API token",
        secret: true,
        hint: "My Profile → API Tokens → Create Token, with Zone → DNS → Edit on this zone only.",
      },
      {
        key: "CLOUDFLARE_ZONE_ID",
        label: "Zone ID",
        secret: false,
        hint: "Cloudflare dashboard → the domain → Overview, bottom right.",
      },
    ],
  },
  {
    title: "Support Center",
    icon: "support",
    description:
      "Powers the customer Support Center. Leave the Intercom ID blank to keep live chat hidden and point customers at tickets instead.",
    fields: [
      {
        key: "INTERCOM_APP_ID",
        label: "Intercom workspace ID",
        secret: false,
        placeholder: "abcd1234",
        hint: "Intercom → Settings → Installation → Web. The short app_id, not an API key.",
      },
      {
        key: "SUPPORT_HOURS",
        label: "Support hours",
        secret: false,
        placeholder: "11am - 8pm (America/Chicago)",
        hint: "Shown on the Support Center page.",
      },
      {
        key: "SUPPORT_PHONE",
        label: "Support phone number",
        secret: false,
        placeholder: "+1-888-000-0000",
        hint: "Optional. Hidden when blank.",
      },
    ],
  },
  {
    title: "Object storage (LITE hibernation)",
    icon: "storage",
    description:
      "Any S3-compatible bucket — AWS S3, Cloudflare R2, Backblaze B2, MinIO. Without this, hibernating a LITE server only suspends it on the panel (still uses a deploy slot). With it configured, hibernate archives the server to this bucket and fully deletes it from the panel, and waking re-provisions a fresh server and restores the archive onto it.",
    fields: [
      {
        key: "S3_BUCKET",
        label: "Bucket name",
        secret: false,
        hint: "Must already exist — HyperNode does not create it for you.",
      },
      {
        key: "S3_REGION",
        label: "Region",
        secret: false,
        placeholder: "auto",
        hint: "\"auto\" works for R2. AWS S3 needs a real region, e.g. us-east-1.",
      },
      {
        key: "S3_ENDPOINT",
        label: "Custom endpoint",
        secret: false,
        placeholder: "https://<account>.r2.cloudflarestorage.com",
        hint: "Leave blank for AWS S3. Required for R2, B2, MinIO, and other non-AWS providers.",
      },
      {
        key: "S3_ACCESS_KEY_ID",
        label: "Access key ID",
        secret: false,
      },
      {
        key: "S3_SECRET_ACCESS_KEY",
        label: "Secret access key",
        secret: true,
      },
    ],
  },
];

function mask(value: string): string {
  if (!value) return "";
  return value.length <= 8 ? "••••" : `••••${value.slice(-4)}`;
}

export default async function AdminSettingsPage() {
  const [values, sources] = await Promise.all([getSettings(), getSettingSources()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold italic text-white">
        <span className="text-gradient-hyper">Settings</span>
      </h1>
      <p className="mb-8 max-w-2xl text-sm text-steel-dim">
        Integration credentials live in the database and take effect within
        seconds — no redeploy needed. Values saved here override environment
        variables of the same name. Leave a field blank to keep its current
        value.
      </p>

      <form action={updateSettings} className="space-y-8">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardBody>
              <div className="mb-1 flex items-center gap-2.5">
                {section.icon === "panel" ? (
                  <PlugZap className="h-5 w-5 text-hyper-400" />
                ) : section.icon === "dns" ? (
                  <Globe className="h-5 w-5 text-hyper-400" />
                ) : section.icon === "support" ? (
                  <LifeBuoy className="h-5 w-5 text-hyper-400" />
                ) : section.icon === "storage" ? (
                  <Database className="h-5 w-5 text-hyper-400" />
                ) : (
                  <CreditCard className="h-5 w-5 text-hyper-400" />
                )}
                <h2 className="font-display text-lg font-bold text-white">{section.title}</h2>
              </div>
              <p className="mb-6 text-sm text-steel-dim">{section.description}</p>

              <div className="space-y-5">
                {section.fields.map((f) => {
                  const source = sources[f.key];
                  const current = values[f.key];
                  return (
                    <div key={f.key}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label htmlFor={f.key}>{f.label}</Label>
                        {source === "database" && <Badge tone="green">saved in database</Badge>}
                        {source === "env" && <Badge tone="blue">from environment</Badge>}
                        {source === "unset" && <Badge tone="red">not set</Badge>}
                      </div>
                      <Input
                        id={f.key}
                        name={f.key}
                        type={f.secret ? "password" : "text"}
                        autoComplete="off"
                        defaultValue={f.secret ? "" : current}
                        placeholder={
                          f.secret && current
                            ? `${mask(current)} — leave blank to keep`
                            : f.placeholder ?? ""
                        }
                      />
                      <div className="mt-1.5 flex items-center justify-between gap-4">
                        {f.hint && <p className="text-xs text-steel-faint">{f.hint}</p>}
                        {source === "database" && (
                          <label className="flex shrink-0 items-center gap-1.5 text-xs text-steel-faint">
                            <input
                              type="checkbox"
                              name={`${f.key}__clear`}
                              className="accent-hyper-500"
                            />
                            clear saved value
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        ))}

        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs text-steel-faint">
            <ShieldCheck className="h-4 w-4 text-success" />
            Secrets are stored server-side and never sent back to the browser.
          </p>
          <Button type="submit">Save settings</Button>
        </div>
      </form>
    </div>
  );
}
