import type { Metadata } from "next";
import { Activity, Server } from "lucide-react";
import { pteroApp, pteroConfigured, type AppNode } from "@/lib/pterodactyl";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Network Status",
  description: "Live status of the HyperNode network and infrastructure.",
};

export const dynamic = "force-dynamic";

async function getNodes(): Promise<{ nodes: AppNode[]; live: boolean }> {
  if (!(await pteroConfigured())) return { nodes: [], live: false };
  try {
    const res = await pteroApp.listNodes();
    return { nodes: res.data.map((n) => n.attributes), live: true };
  } catch {
    return { nodes: [], live: false };
  }
}

export default async function StatusPage() {
  const { nodes, live } = await getNodes();
  const allHealthy = nodes.every((n) => !n.maintenance_mode);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl font-extrabold italic text-white">
          Network <span className="text-gradient-hyper">status</span>
        </h1>
        <div className="mt-5 flex justify-center">
          {live ? (
            allHealthy ? (
              <Badge tone="green">
                <Activity className="h-3 w-3" /> All systems operational
              </Badge>
            ) : (
              <Badge tone="yellow">
                <Activity className="h-3 w-3" /> Partial maintenance in progress
              </Badge>
            )
          ) : (
            <Badge tone="steel">
              <Activity className="h-3 w-3" /> Live telemetry temporarily unavailable
            </Badge>
          )}
        </div>
      </div>

      {nodes.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {nodes.map((n) => {
            const memPct = n.allocated_resources
              ? Math.min(100, Math.round((n.allocated_resources.memory / n.memory) * 100))
              : null;
            const diskPct = n.allocated_resources
              ? Math.min(100, Math.round((n.allocated_resources.disk / n.disk) * 100))
              : null;
            return (
              <Card key={n.id}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
                      <Server className="h-4 w-4 text-hyper-400" /> {n.name}
                    </h2>
                    {n.maintenance_mode ? (
                      <Badge tone="yellow">Maintenance</Badge>
                    ) : (
                      <Badge tone="green">Operational</Badge>
                    )}
                  </div>
                  <div className="mt-5 space-y-4">
                    {memPct !== null && (
                      <Meter
                        label="Memory allocated"
                        pct={memPct}
                        detail={`${formatBytes((n.allocated_resources?.memory ?? 0) * 1024 * 1024)} / ${formatBytes(n.memory * 1024 * 1024)}`}
                      />
                    )}
                    {diskPct !== null && (
                      <Meter
                        label="Disk allocated"
                        pct={diskPct}
                        detail={`${formatBytes((n.allocated_resources?.disk ?? 0) * 1024 * 1024)} / ${formatBytes(n.disk * 1024 * 1024)}`}
                      />
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-steel-faint">
          Node telemetry will appear here once the panel connection is
          configured. All customer services are monitored 24/7 regardless.
        </p>
      )}
    </div>
  );
}

function Meter({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  const tone = pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-hyper-gradient";
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-steel-dim">{label}</span>
        <span className="text-steel-faint">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-night-200">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
