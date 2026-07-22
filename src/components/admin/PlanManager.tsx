"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { GAMES } from "@/content/games";
import { createPlan, updatePlan, deletePlan } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

export interface AdminPlan {
  id: string;
  productType: "GAME_SERVER" | "VPS" | "DEDICATED";
  gameSlug: string | null;
  name: string;
  slots: number | null;
  ramMb: number;
  cpuPercent: number;
  diskMb: number;
  databases: number;
  backups: number;
  price: string;
  nestId: number | null;
  eggId: number | null;
  nodeId: number | null;
  sortOrder: number;
  active: boolean;
  orders: number;
}

export interface PteroCatalog {
  live: boolean;
  nodes: { id: number; name: string; fqdn: string }[];
  nests: { id: number; name: string; eggs: { id: number; name: string }[] }[];
}

// ─── Single plan form (create + edit) ────────────────────────────────────

function PlanForm({
  plan,
  catalog,
  onDone,
}: {
  plan?: AdminPlan;
  catalog: PteroCatalog;
  onDone?: () => void;
}) {
  const [productType, setProductType] = useState(plan?.productType ?? "GAME_SERVER");
  const [gameSlug, setGameSlug] = useState(plan?.gameSlug ?? GAMES[0]?.slug ?? "");
  const [nestId, setNestId] = useState<string>(plan?.nestId ? String(plan.nestId) : "");
  const [eggId, setEggId] = useState<string>(plan?.eggId ? String(plan.eggId) : "");

  const eggs = useMemo(
    () => catalog.nests.find((n) => String(n.id) === nestId)?.eggs ?? [],
    [catalog.nests, nestId],
  );

  const action = plan ? updatePlan : createPlan;

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      className="space-y-5"
    >
      {plan && <input type="hidden" name="planId" value={plan.id} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Product</Label>
          <Select
            name="productType"
            value={productType}
            onChange={(e) => setProductType(e.target.value as AdminPlan["productType"])}
          >
            <option value="GAME_SERVER">Game server</option>
            <option value="VPS">VPS</option>
            <option value="DEDICATED">Dedicated</option>
          </Select>
        </div>
        {productType === "GAME_SERVER" && (
          <div>
            <Label>Game</Label>
            <Select
              name="gameSlug"
              value={gameSlug}
              onChange={(e) => setGameSlug(e.target.value)}
            >
              {GAMES.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className={productType === "GAME_SERVER" ? "" : "sm:col-span-2"}>
          <Label>Plan name</Label>
          <Input name="name" defaultValue={plan?.name ?? ""} placeholder="Rust — 100 slots" required />
        </div>
      </div>

      {/* ── Pterodactyl deployment mapping ── */}
      <div className="rounded-xl border border-white/[0.06] bg-night-100/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-steel-dim">
          Pterodactyl deployment{" "}
          {catalog.live ? (
            <Badge tone="green" className="ml-2">synced from panel</Badge>
          ) : (
            <Badge tone="red" className="ml-2">panel offline — enter IDs manually</Badge>
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Node</Label>
            {catalog.live ? (
              <Select name="nodeId" defaultValue={plan?.nodeId ? String(plan.nodeId) : ""}>
                <option value="">Any (customer&apos;s location)</option>
                {catalog.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} — {n.fqdn}
                  </option>
                ))}
              </Select>
            ) : (
              <Input name="nodeId" defaultValue={plan?.nodeId ?? ""} inputMode="numeric" placeholder="optional" />
            )}
          </div>
          <div>
            <Label>Nest</Label>
            {catalog.live ? (
              <Select
                name="nestId"
                value={nestId}
                onChange={(e) => {
                  setNestId(e.target.value);
                  setEggId("");
                }}
              >
                <option value="">— select nest —</option>
                {catalog.nests.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input name="nestId" defaultValue={plan?.nestId ?? ""} inputMode="numeric" />
            )}
          </div>
          <div>
            <Label>Egg</Label>
            {catalog.live ? (
              <Select
                name="eggId"
                value={eggId}
                onChange={(e) => setEggId(e.target.value)}
                disabled={!nestId}
              >
                <option value="">{nestId ? "— select egg —" : "select a nest first"}</option>
                {eggs.map((egg) => (
                  <option key={egg.id} value={egg.id}>
                    {egg.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input name="eggId" defaultValue={plan?.eggId ?? ""} inputMode="numeric" />
            )}
          </div>
        </div>
      </div>

      {/* ── Resources & pricing ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <Label>Slots / units</Label>
          <Input name="slots" defaultValue={plan?.slots ?? ""} inputMode="numeric" />
        </div>
        <div>
          <Label>RAM (MB)</Label>
          <Input name="ramMb" defaultValue={plan?.ramMb ?? 4096} inputMode="numeric" required />
        </div>
        <div>
          <Label>CPU % (100 = 1 core)</Label>
          <Input name="cpuPercent" defaultValue={plan?.cpuPercent ?? 200} inputMode="numeric" required />
        </div>
        <div>
          <Label>Disk (MB)</Label>
          <Input name="diskMb" defaultValue={plan?.diskMb ?? 16384} inputMode="numeric" required />
        </div>
        <div>
          <Label>Databases</Label>
          <Input name="databases" defaultValue={plan?.databases ?? 1} inputMode="numeric" />
        </div>
        <div>
          <Label>Backups</Label>
          <Input name="backups" defaultValue={plan?.backups ?? 2} inputMode="numeric" />
        </div>
        <div>
          <Label>Price $/mo</Label>
          <Input name="price" defaultValue={plan?.price ?? ""} inputMode="decimal" required />
        </div>
        <div>
          <Label>Sort order</Label>
          <Input name="sortOrder" defaultValue={plan?.sortOrder ?? 0} inputMode="numeric" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-5 text-xs text-steel-dim">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="active"
              defaultChecked={plan?.active ?? true}
              className="accent-hyper-500"
            />
            active (purchasable)
          </label>
          {plan?.gameSlug && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="applyToGame" className="accent-hyper-500" />
              apply node/nest/egg to all {plan.gameSlug.replace(/-/g, " ")} plans
            </label>
          )}
        </div>
        <div className="flex gap-2">
          {onDone && (
            <Button type="button" size="sm" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button size="sm" type="submit">
            {plan ? "Save plan" : "Create plan"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Plan row (summary + expandable editor) ──────────────────────────────

function PlanRow({ plan, catalog }: { plan: AdminPlan; catalog: PteroCatalog }) {
  const [open, setOpen] = useState(false);
  const nodeName = catalog.nodes.find((n) => n.id === plan.nodeId)?.name;
  const eggName = catalog.nests
    .find((n) => n.id === plan.nestId)
    ?.eggs.find((e) => e.id === plan.eggId)?.name;

  return (
    <Card className={cn(!plan.active && "opacity-60")}>
      <CardBody className="py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{plan.name}</p>
            <p className="mt-0.5 text-xs text-steel-faint">
              {Math.round(plan.ramMb / 1024)} GB · {plan.cpuPercent}% CPU ·{" "}
              {Math.round(plan.diskMb / 1024)} GB disk · ${plan.price}/mo
              {plan.orders > 0 && ` · ${plan.orders} order${plan.orders === 1 ? "" : "s"}`}
            </p>
          </div>
          {!plan.active && <Badge tone="steel">retired</Badge>}
          {plan.eggId ? (
            <Badge tone="green">{eggName ?? `egg ${plan.eggId}`}</Badge>
          ) : (
            <Badge tone="red">no egg mapped</Badge>
          )}
          {plan.nodeId && <Badge tone="blue">{nodeName ?? `node ${plan.nodeId}`}</Badge>}
          <form
            action={deletePlan}
            onSubmit={(e) => {
              const msg =
                plan.orders > 0
                  ? `"${plan.name}" has ${plan.orders} order(s), so it will be retired (deactivated) instead of deleted. Continue?`
                  : `Delete "${plan.name}" permanently?`;
              if (!confirm(msg)) e.preventDefault();
            }}
          >
            <input type="hidden" name="planId" value={plan.id} />
            <button
              type="submit"
              className="ring-focus rounded-lg p-2 text-steel-faint transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label={`Delete ${plan.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
          <Button size="sm" variant="secondary" type="button" onClick={() => setOpen(!open)}>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            {open ? "Close" : "Edit"}
          </Button>
        </div>
        {open && (
          <div className="mt-5 border-t border-white/[0.06] pt-5">
            <PlanForm plan={plan} catalog={catalog} onDone={() => setOpen(false)} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Manager (page body) ─────────────────────────────────────────────────

export function PlanManager({
  plans,
  catalog,
}: {
  plans: AdminPlan[];
  catalog: PteroCatalog;
}) {
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, AdminPlan[]>();
    for (const p of plans) {
      const key =
        p.productType === "GAME_SERVER"
          ? GAMES.find((g) => g.slug === p.gameSlug)?.name ?? p.gameSlug ?? "Game servers"
          : p.productType === "VPS"
            ? "VPS"
            : "Dedicated";
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return Array.from(map.entries());
  }, [plans]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        {!catalog.live ? (
          <p className="flex items-center gap-2 text-xs text-warning">
            <RefreshCw className="h-3.5 w-3.5" />
            Pterodactyl isn&apos;t reachable — dropdowns are unavailable, IDs can be entered manually.
          </p>
        ) : (
          <p className="text-xs text-steel-faint">
            {catalog.nodes.length} node{catalog.nodes.length === 1 ? "" : "s"} ·{" "}
            {catalog.nests.length} nest{catalog.nests.length === 1 ? "" : "s"} synced live from the panel
          </p>
        )}
        <Button size="sm" type="button" onClick={() => setCreating(!creating)}>
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </div>

      {creating && (
        <Card className="mb-8 border-hyper-500/30">
          <CardBody>
            <h2 className="mb-5 font-display text-lg font-bold text-white">Create a plan</h2>
            <PlanForm catalog={catalog} onDone={() => setCreating(false)} />
          </CardBody>
        </Card>
      )}

      {groups.length === 0 && !creating && (
        <Card>
          <CardBody className="py-14 text-center text-sm text-steel-faint">
            No plans yet — create one above, or they appear automatically after the
            first checkout of each configuration.
          </CardBody>
        </Card>
      )}

      <div className="space-y-8">
        {groups.map(([group, list]) => (
          <div key={group}>
            <h2 className="mb-3 font-display text-lg font-bold text-white">{group}</h2>
            <div className="space-y-3">
              {list.map((p) => (
                <PlanRow key={p.id} plan={p} catalog={catalog} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
