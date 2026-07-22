import { db } from "@/lib/db";
import { pteroApp, pteroConfigured } from "@/lib/pterodactyl";
import {
  PlanManager,
  type AdminPlan,
  type PteroCatalog,
} from "@/components/admin/PlanManager";

export const dynamic = "force-dynamic";

async function loadCatalog(): Promise<PteroCatalog> {
  if (!(await pteroConfigured())) return { live: false, nodes: [], nests: [] };
  try {
    const [nodesRes, nestsRes] = await Promise.all([
      pteroApp.listNodes(),
      pteroApp.listNests(),
    ]);
    const nests = await Promise.all(
      nestsRes.data.map(async (nest) => {
        const eggs = await pteroApp.listEggs(nest.attributes.id);
        return {
          id: nest.attributes.id,
          name: nest.attributes.name,
          eggs: eggs.data.map((e) => ({ id: e.attributes.id, name: e.attributes.name })),
        };
      }),
    );
    return {
      live: true,
      nodes: nodesRes.data.map((n) => ({
        id: n.attributes.id,
        name: n.attributes.name,
        fqdn: n.attributes.fqdn,
      })),
      nests,
    };
  } catch {
    return { live: false, nodes: [], nests: [] };
  }
}

export default async function AdminPlansPage() {
  const [plans, catalog] = await Promise.all([
    db.plan.findMany({
      orderBy: [{ productType: "asc" }, { gameSlug: "asc" }, { sortOrder: "asc" }, { ramMb: "asc" }],
      include: { _count: { select: { orders: true } } },
    }),
    loadCatalog(),
  ]);

  const serialized: AdminPlan[] = plans.map((p) => ({
    id: p.id,
    productType: p.productType,
    gameSlug: p.gameSlug,
    name: p.name,
    slots: p.slots,
    ramMb: p.ramMb,
    cpuPercent: p.cpuPercent,
    diskMb: p.diskMb,
    databases: p.databases,
    backups: p.backups,
    price: String(p.priceMonthly),
    nestId: p.nestId,
    eggId: p.eggId,
    nodeId: p.nodeId,
    sortOrder: p.sortOrder,
    active: p.active,
    orders: p._count.orders,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold italic text-white">
        <span className="text-gradient-hyper">Plans</span>
      </h1>
      <p className="mb-8 max-w-2xl text-sm text-steel-dim">
        Plans are also created automatically the first time a configuration is
        purchased. Map each plan to a Pterodactyl <strong>nest &amp; egg</strong>{" "}
        (and optionally pin it to a node) using the live-synced dropdowns below.
      </p>
      <PlanManager plans={serialized} catalog={catalog} />
    </div>
  );
}
