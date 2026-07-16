import { db } from "@/lib/db";
import { pteroApp, pteroConfigured, type AppServer } from "@/lib/pterodactyl";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/utils";
import { PanelNotConfigured } from "@/components/admin/PanelNotConfigured";
import {
  pteroDeleteServer,
  pteroReinstallServer,
  pteroSuspendServer,
  pteroUnsuspendServer,
} from "../actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminServersPage() {
  if (!(await pteroConfigured())) return <PanelNotConfigured title="Servers" />;

  let servers: AppServer[] = [];
  let error = "";
  try {
    const res = await pteroApp.listServers();
    servers = res.data.map((s) => s.attributes);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach the panel";
  }

  const orders = await db.order.findMany({
    where: { pteroServerId: { in: servers.map((s) => s.id) } },
    include: { user: true },
  });
  const orderByServer = new Map(orders.map((o) => [o.pteroServerId!, o]));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 font-display text-2xl font-extrabold italic text-white">
        Pterodactyl <span className="text-gradient-hyper">servers</span>
      </h1>
      {error && <p className="mb-6 text-sm text-danger">{error}</p>}
      <div className="space-y-4">
        {servers.map((s) => {
          const order = orderByServer.get(s.id);
          return (
            <Card key={s.id}>
              <CardBody className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{s.name}</p>
                    {s.suspended ? (
                      <Badge tone="red">Suspended</Badge>
                    ) : s.status === "installing" ? (
                      <Badge tone="yellow">Installing</Badge>
                    ) : (
                      <Badge tone="green">OK</Badge>
                    )}
                    <span className="font-mono text-xs text-steel-faint">
                      #{s.id} · {s.identifier}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-steel-faint">
                    {formatBytes(s.limits.memory * 1024 * 1024)} RAM ·{" "}
                    {s.limits.cpu}% CPU · node {s.node} · egg {s.egg}
                    {order && (
                      <>
                        {" · "}
                        <span className="text-hyper-300">{order.user.email}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order && (
                    <Link href={`/dashboard/servers/${order.id}`}>
                      <Button size="sm" variant="outline">Open panel</Button>
                    </Link>
                  )}
                  {s.suspended ? (
                    <form action={pteroUnsuspendServer}>
                      <input type="hidden" name="serverId" value={s.id} />
                      <Button size="sm" variant="secondary">Unsuspend</Button>
                    </form>
                  ) : (
                    <form action={pteroSuspendServer}>
                      <input type="hidden" name="serverId" value={s.id} />
                      <Button size="sm" variant="secondary">Suspend</Button>
                    </form>
                  )}
                  <form action={pteroReinstallServer}>
                    <input type="hidden" name="serverId" value={s.id} />
                    <Button size="sm" variant="ghost">Reinstall</Button>
                  </form>
                  <form action={pteroDeleteServer}>
                    <input type="hidden" name="serverId" value={s.id} />
                    <Button size="sm" variant="danger">Delete</Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          );
        })}
        {servers.length === 0 && !error && (
          <Card>
            <CardBody className="py-14 text-center text-sm text-steel-faint">
              No servers on the panel yet.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
