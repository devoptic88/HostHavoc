import Link from "next/link";
import { PlugZap } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

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
            Add your Pterodactyl panel URL and API keys in{" "}
            <Link href="/admin/settings" className="text-hyper-300 underline underline-offset-2">
              Admin → Settings
            </Link>
            . Changes take effect immediately — no restart needed.
          </p>
          <div className="mt-6">
            <ButtonLink href="/admin/settings" size="sm">
              Open Settings
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
