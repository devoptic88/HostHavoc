import { pteroApp, pteroConfigured, type AppLocation } from "@/lib/pterodactyl";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { PanelNotConfigured } from "@/components/admin/PanelNotConfigured";
import { createLocation, deleteLocation } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  if (!pteroConfigured()) return <PanelNotConfigured title="Locations" />;

  let locations: AppLocation[] = [];
  let error = "";
  try {
    locations = (await pteroApp.listLocations()).data.map((l) => l.attributes);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach the panel";
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold italic text-white">
        <span className="text-gradient-hyper">Locations</span>
      </h1>
      <p className="mb-8 text-sm text-steel-dim">
        These sync to the marketing site&apos;s location pickers automatically.
      </p>
      {error && <p className="mb-6 text-sm text-danger">{error}</p>}

      <Card className="mb-6">
        <CardBody>
          <form action={createLocation} className="grid items-end gap-3 sm:grid-cols-3">
            <div>
              <Label>Short code</Label>
              <Input name="short" required placeholder="us-dal" />
            </div>
            <div>
              <Label>Description</Label>
              <Input name="long" placeholder="Dallas, TX" />
            </div>
            <Button type="submit" variant="secondary">Add location</Button>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {locations.map((l) => (
          <Card key={l.id}>
            <CardBody className="flex items-center gap-4 py-4">
              <div className="flex-1">
                <p className="font-semibold text-white">{l.long || l.short}</p>
                <p className="font-mono text-xs text-steel-faint">
                  {l.short} · id {l.id}
                </p>
              </div>
              <form action={deleteLocation}>
                <input type="hidden" name="locationId" value={l.id} />
                <Button size="sm" variant="ghost" type="submit">Delete</Button>
              </form>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
