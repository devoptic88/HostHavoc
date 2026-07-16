import { pteroApp, pteroConfigured } from "@/lib/pterodactyl";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PanelNotConfigured } from "@/components/admin/PanelNotConfigured";

export const dynamic = "force-dynamic";

export default async function AdminEggsPage() {
  if (!(await pteroConfigured())) return <PanelNotConfigured title="Nests & Eggs" />;

  let error = "";
  const nests: {
    id: number;
    name: string;
    eggs: { id: number; name: string; docker: string }[];
  }[] = [];

  try {
    const nestList = (await pteroApp.listNests()).data.map((n) => n.attributes);
    for (const nest of nestList) {
      const eggs = (await pteroApp.listEggs(nest.id)).data.map((e) => ({
        id: e.attributes.id,
        name: e.attributes.name,
        docker: e.attributes.docker_image,
      }));
      nests.push({ id: nest.id, name: nest.name, eggs });
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach the panel";
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold italic text-white">
        Nests & <span className="text-gradient-hyper">eggs</span>
      </h1>
      <p className="mb-8 text-sm text-steel-dim">
        Use these IDs when mapping game plans in Admin → Plans.
      </p>
      {error && <p className="mb-6 text-sm text-danger">{error}</p>}

      <div className="space-y-6">
        {nests.map((nest) => (
          <Card key={nest.id}>
            <CardBody>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-display text-base font-bold text-white">{nest.name}</h2>
                <Badge tone="blue">nest {nest.id}</Badge>
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {nest.eggs.map((egg) => (
                  <li key={egg.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="flex-1 text-sm font-medium text-steel">{egg.name}</span>
                    <span className="hidden font-mono text-xs text-steel-faint sm:block">
                      {egg.docker}
                    </span>
                    <Badge tone="steel">egg {egg.id}</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
