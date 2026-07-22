import type { Metadata } from "next";
import { Activity, LifeBuoy, Server, ShieldCheck, Timer, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { pteroApp, pteroConfigured, type AppNode } from "@/lib/pterodactyl";
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
    return { nodes: res.data.map((node) => node.attributes), live: true };
  } catch {
    return { nodes: [], live: false };
  }
}

export default async function StatusPage() {
  const { nodes, live } = await getNodes();
  const allHealthy = nodes.every((node) => !node.maintenance_mode);

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
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-steel-dim">
          We expose live infrastructure state here so buyers and customers can verify platform health before they deploy and while they operate. This page stays calm on purpose: clear signals, direct language, and fast support escalation when something changes.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <StatusCallout
          icon={ShieldCheck}
          title="Operational policy"
          body="Live status is mirrored from the infrastructure layer whenever telemetry is available."
        />
        <StatusCallout
          icon={Timer}
          title="Response posture"
          body="Support and operations use the same incident signals surfaced here during provisioning and runtime issues."
        />
        <StatusCallout
          icon={LifeBuoy}
          title="Need help?"
          body="Customers can open server-aware tickets directly from the dashboard when something looks off."
        />
      </div>

      {nodes.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {nodes.map((node) => {
            const memPct = node.allocated_resources
              ? Math.min(100, Math.round((node.allocated_resources.memory / node.memory) * 100))
              : null;
            const diskPct = node.allocated_resources
              ? Math.min(100, Math.round((node.allocated_resources.disk / node.disk) * 100))
              : null;
            return (
              <Card key={node.id}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
                      <Server className="h-4 w-4 text-hyper-400" /> {node.name}
                    </h2>
                    {node.maintenance_mode ? (
                      <Badge tone="yellow">Maintenance</Badge>
                    ) : (
                      <Badge tone="green">Operational</Badge>
                    )}
                  </div>
                  <div className="mt-5 space-y-4">
                    {memPct !== null ? (
                      <Meter
                        label="Memory allocated"
                        pct={memPct}
                        detail={`${formatBytes((node.allocated_resources?.memory ?? 0) * 1024 * 1024)} / ${formatBytes(node.memory * 1024 * 1024)}`}
                      />
                    ) : null}
                    {diskPct !== null ? (
                      <Meter
                        label="Disk allocated"
                        pct={diskPct}
                        detail={`${formatBytes((node.allocated_resources?.disk ?? 0) * 1024 * 1024)} / ${formatBytes(node.disk * 1024 * 1024)}`}
                      />
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-steel-faint">
          Node telemetry will appear here once the panel connection is configured. Customer services are still monitored continuously regardless.
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

function StatusCallout({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-steel-faint">
        <Icon className="h-4 w-4 text-hyper-300" />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em]">{title}</p>
      </div>
      <p className="mt-2 text-sm text-steel">{body}</p>
    </div>
  );
}
