import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { updatePlan } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await db.plan.findMany({
    orderBy: [{ productType: "asc" }, { gameSlug: "asc" }, { ramMb: "asc" }],
  });

  const groups = new Map<string, typeof plans>();
  for (const p of plans) {
    const key = p.gameSlug ?? p.productType;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 font-display text-2xl font-extrabold italic text-white">
        <span className="text-gradient-hyper">Plans</span> & egg mapping
      </h1>
      <p className="mb-8 max-w-2xl text-sm text-steel-dim">
        Plans are created automatically the first time a configuration is
        purchased. Map each game to its Pterodactyl <strong>nest & egg ID</strong>{" "}
        here (find IDs under Nests &amp; Eggs) — tick “apply to all” to map the
        whole game at once.
      </p>

      {groups.size === 0 && (
        <Card>
          <CardBody className="py-14 text-center text-sm text-steel-faint">
            No plans yet — they appear after the first checkout of each
            configuration.
          </CardBody>
        </Card>
      )}

      <div className="space-y-8">
        {Array.from(groups.entries()).map(([group, list]) => (
          <div key={group}>
            <h2 className="mb-3 font-display text-lg font-bold capitalize text-white">
              {group.replace(/-/g, " ")}
            </h2>
            <div className="space-y-3">
              {list.map((p) => (
                <Card key={p.id}>
                  <CardBody className="py-4">
                    <form action={updatePlan} className="grid items-end gap-3 lg:grid-cols-8">
                      <input type="hidden" name="planId" value={p.id} />
                      <div className="lg:col-span-2">
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <div className="mt-1">
                          {p.eggId ? (
                            <Badge tone="green">egg {p.eggId}</Badge>
                          ) : (
                            <Badge tone="red">no egg mapped</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Nest ID</Label>
                        <Input name="nestId" defaultValue={p.nestId ?? ""} inputMode="numeric" />
                      </div>
                      <div>
                        <Label>Egg ID</Label>
                        <Input name="eggId" defaultValue={p.eggId ?? ""} inputMode="numeric" />
                      </div>
                      <div>
                        <Label>RAM (MB)</Label>
                        <Input name="ramMb" defaultValue={p.ramMb} inputMode="numeric" />
                      </div>
                      <div>
                        <Label>CPU %</Label>
                        <Input name="cpuPercent" defaultValue={p.cpuPercent} inputMode="numeric" />
                      </div>
                      <div>
                        <Label>Price $/mo</Label>
                        <Input name="price" defaultValue={String(p.priceMonthly)} inputMode="decimal" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-steel-dim">
                          <input type="checkbox" name="applyToGame" className="accent-hyper-500" />
                          apply to all
                        </label>
                        <Button size="sm" variant="secondary" type="submit">Save</Button>
                      </div>
                    </form>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
