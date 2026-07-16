import { CreditCard, PlugZap, ShieldCheck } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { getSettings, getSettingSources, type SettingKey } from "@/lib/settings";
import { updateSettings } from "../actions";

export const dynamic = "force-dynamic";

const SECTIONS: {
  title: string;
  icon: "panel" | "stripe";
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
    title: "Stripe billing",
    icon: "stripe",
    description:
      "Without these, checkout runs in dev mode and provisions orders without payment.",
    fields: [
      {
        key: "STRIPE_SECRET_KEY",
        label: "Secret key",
        secret: true,
        hint: "Dashboard → Developers → API keys (sk_live_… or sk_test_…).",
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        label: "Webhook signing secret",
        secret: true,
        hint: "From the webhook endpoint you create for /api/stripe/webhook (whsec_…).",
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
