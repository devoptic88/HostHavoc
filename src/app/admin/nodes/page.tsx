import Link from "next/link";
import { pteroApp, pteroConfigured, type AppNode } from "@/lib/pterodactyl";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatBytes } from "@/lib/utils";
import { PanelNotConfigured } from "@/components/admin/PanelNotConfigured";

export const dynamic = "force-dynamic";

export default async function AdminNodesPage() {
  if (!(await pteroConfigured())) return <PanelNotConfigured title="Nodes" />;

  let nodes: AppNode[] = [];
  let error = "";
  try {
    const res = await pteroApp.listNodes();
    nodes = res.data.map((n) => n.attributes);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach the panel";
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        <span className="text-gradient-hyper">Nodes</span>
      </h1>
      {error && <p className="mb-6 text-sm text-danger">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {nodes.map((n) => (
          <Link key={n.id} href={`/admin/nodes/${n.id}`}>
            <Card glow>
              <CardBody>
                <div className="flex items-center justify-between">
                  <p className="font-display text-base font-bold text-white">{n.name}</p>
                  {n.maintenance_mode ? (
                    <Badge tone="yellow">Maintenance</Badge>
                  ) : (
                    <Badge tone="green">Online</Badge>
                  )}
                </div>
                <p className="mt-1 font-mono text-xs text-steel-faint">
                  {n.scheme}://{n.fqdn}:{n.daemon_listen}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-steel-dim">
                  <span>
                    RAM: {formatBytes((n.allocated_resources?.memory ?? 0) * 1048576)} /{" "}
                    {formatBytes(n.memory * 1048576)}
                  </span>
                  <span>
                    Disk: {formatBytes((n.allocated_resources?.disk ?? 0) * 1048576)} /{" "}
                    {formatBytes(n.disk * 1048576)}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-hyper-300">
                  Manage allocations →
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
        {nodes.length === 0 && !error && (
          <Card className="md:col-span-2">
            <CardBody className="py-14 text-center text-sm text-steel-faint">
              No nodes found on the panel.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
