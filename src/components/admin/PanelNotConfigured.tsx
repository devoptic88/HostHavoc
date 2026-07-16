import { PlugZap } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

export function PanelNotConfigured({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        {title}
      </h1>
      <Card>
        <CardBody className="py-14 text-center">
          <PlugZap className="mx-auto h-10 w-10 text-steel-faint" />
          <p className="mt-4 font-display text-lg font-bold text-white">
            Panel connection not configured
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-steel-dim">
            Set <code className="rounded bg-night-200 px-1.5 py-0.5 font-mono text-xs">PTERODACTYL_URL</code>,{" "}
            <code className="rounded bg-night-200 px-1.5 py-0.5 font-mono text-xs">PTERODACTYL_APP_API_KEY</code>{" "}
            and{" "}
            <code className="rounded bg-night-200 px-1.5 py-0.5 font-mono text-xs">PTERODACTYL_CLIENT_API_KEY</code>{" "}
            in your <code className="rounded bg-night-200 px-1.5 py-0.5 font-mono text-xs">.env</code> (and on
            Railway), then restart the app.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
