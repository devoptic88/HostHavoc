import Link from "next/link";
import { notFound } from "next/navigation";
import { pteroApp, pteroConfigured } from "@/lib/pterodactyl";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { PanelNotConfigured } from "@/components/admin/PanelNotConfigured";
import { createAllocations, deleteAllocation } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminNodeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!pteroConfigured()) return <PanelNotConfigured title="Node" />;
  const nodeId = Number(params.id);
  if (!Number.isFinite(nodeId)) notFound();

  let node;
  let allocations;
  try {
    node = (await pteroApp.getNode(nodeId)).attributes;
    allocations = (await pteroApp.getNodeAllocations(nodeId)).data.map(
      (a) => a.attributes,
    );
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/nodes" className="text-xs text-steel-faint hover:text-hyper-300">
        ← All nodes
      </Link>
      <h1 className="mb-8 mt-2 font-display text-2xl font-extrabold italic text-white">
        Node: <span className="text-gradient-hyper">{node.name}</span>
      </h1>

      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-4 font-display text-base font-bold text-white">
            Add allocations
          </h2>
          <form action={createAllocations} className="grid items-end gap-3 sm:grid-cols-4">
            <input type="hidden" name="nodeId" value={node.id} />
            <div>
              <Label>IP address</Label>
              <Input name="ip" required placeholder="0.0.0.0" />
            </div>
            <div className="sm:col-span-2">
              <Label>Ports (comma separated, ranges ok)</Label>
              <Input name="ports" required placeholder="25565, 27015-27020" />
            </div>
            <Button type="submit" variant="secondary">Create</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <div className="scrollbar-slim max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-night-100">
                <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-steel-faint">
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3">Port</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {allocations.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-2.5 font-mono text-steel-dim">
                      {a.alias ?? a.ip}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-white">{a.port}</td>
                    <td className="px-5 py-2.5">
                      {a.assigned ? (
                        <Badge tone="blue">In use</Badge>
                      ) : (
                        <Badge tone="steel">Free</Badge>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {!a.assigned && (
                        <form action={deleteAllocation}>
                          <input type="hidden" name="nodeId" value={node.id} />
                          <input type="hidden" name="allocationId" value={a.id} />
                          <Button size="sm" variant="ghost" type="submit">
                            Delete
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
