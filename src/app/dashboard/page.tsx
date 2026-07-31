import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CreditCard, LifeBuoy, Plus, Search, Server, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { GAMES, gameCapsule, gameHero } from "@/content/games";
import { normalizePterodactylMessage } from "@/lib/pterodactyl/errorMessages";
import { pteroApp, pteroClient } from "@/lib/pterodactyl";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const orderStatusMap: Record<string, string> = {
  PENDING: "installing",
  PROVISIONING: "installing",
  ACTIVE: "running",
  SUSPENDED: "suspended",
  GRACE_PERIOD: "suspended",
  FAILED: "install_failed",
  CANCELLED: "offline",
  MANUAL: "installing",
};

type LiveDashboardStatus =
  | "installing"
  | "starting"
  | "running"
  | "stopping"
  | "offline"
  | "suspended"
  | "install_failed";

function liveStatusMessage(status: LiveDashboardStatus) {
  switch (status) {
    case "installing":
      return "Server installing";
    case "starting":
      return "Server starting";
    case "running":
      return "Server running";
    case "stopping":
      return "Server stopping";
    default:
      return null;
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const [orders, openTickets] = await Promise.all([
    db.order.findMany({
      where: { userId: session!.user.id, status: { not: "CANCELLED" } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    db.ticket.count({
      where: { userId: session!.user.id, status: { in: ["OPEN", "ANSWERED", "CUSTOMER_REPLY"] } },
    }),
  ]);

  const liveStatuses = new Map<string, LiveDashboardStatus>();

  await Promise.all(
    orders
      .filter((order) => order.productType === "GAME_SERVER" && order.pteroServerIdentifier)
      .map(async (order) => {
        try {
          if (order.pteroServerId) {
            const panelServer = await pteroApp.getServer(order.pteroServerId);
            const installStatus = panelServer.attributes.status;
            if (installStatus === "installing") {
              liveStatuses.set(order.id, "installing");
              return;
            }
            if (installStatus === "install_failed") {
              liveStatuses.set(order.id, "install_failed");
              return;
            }
          }

          const server = await pteroClient.getClientServer(order.pteroServerIdentifier!);
          if (server.attributes.is_suspended) {
            liveStatuses.set(order.id, "suspended");
            return;
          }
          const resources = await pteroClient.getResources(order.pteroServerIdentifier!);
          liveStatuses.set(order.id, resources.attributes.current_state);
        } catch {
          if (order.status === "FAILED") liveStatuses.set(order.id, "install_failed");
        }
      }),
  );

  const featuredOrder = orders[0];
  const otherOrders = orders.slice(1);
  const activeGameServers = orders.filter((order) => order.productType === "GAME_SERVER");
  const activeSpend = orders
    .filter((order) => ["ACTIVE", "PROVISIONING", "PENDING", "GRACE_PERIOD"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.plan.priceMonthly), 0);
  const spotlightGames = GAMES.filter((game) => game.categories.includes("popular")).slice(0, 5);
  const firstName = session!.user.name.split(" ")[0];
  const serverLayoutParam = Array.isArray(searchParams?.serverLayout)
    ? searchParams?.serverLayout[0]
    : searchParams?.serverLayout;
  const serverLayout = serverLayoutParam === "compact" ? "compact" : "cards";
  const createDashboardHref = (layout: "cards" | "compact") => {
    const params = new URLSearchParams();

    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (key === "serverLayout" || value == null) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry));
        return;
      }
      params.set(key, value);
    });

    if (layout === "compact") params.set("serverLayout", "compact");

    const query = params.toString();
    return query ? `/dashboard?${query}` : "/dashboard";
  };
  const renderServerCard = (order: (typeof orders)[number]) => {
    const game = GAMES.find((entry) => entry.slug === order.plan.gameSlug);
    const manageable = order.productType === "GAME_SERVER" && order.pteroServerIdentifier;
    const liveStatus = liveStatuses.get(order.id);
    const displayStatus =
      liveStatus ??
      (orderStatusMap[order.status] as LiveDashboardStatus | undefined) ??
      "offline";
    const liveMessage = liveStatusMessage(displayStatus);

    const card = (
      <Card glow className="overflow-hidden border-white/10 bg-night-100/95">
        <div className="relative min-h-[360px]">
          {game && (
            <>
              <Image
                src={gameHero(game.slug)}
                alt={game.name}
                fill
                className="object-cover opacity-45"
                sizes="(min-width: 1280px) 900px, 100vw"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(120deg, ${game.accent}55 0%, rgba(5,7,13,0.25) 22%, rgba(5,7,13,0.92) 70%), linear-gradient(180deg, rgba(5,7,13,0.18) 0%, rgba(5,7,13,0.92) 100%)`,
                }}
              />
            </>
          )}
          <div className="relative flex h-full min-h-[360px] flex-col justify-between p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="blue">{game?.name ?? order.plan.name}</Badge>
                  {game?.badge ? <Badge tone="violet">{game.badge}</Badge> : null}
                </div>
                <h3 className="max-w-2xl font-display text-3xl font-extrabold text-white sm:text-4xl">
                  {order.serverName}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-steel">
                  {game?.tagline ?? order.plan.name}
                </p>
              </div>
              <StatusBadge status={displayStatus} />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-steel-faint">Plan</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">{order.plan.name}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-steel-faint">Billing</p>
                  <p className="mt-1 font-display text-xl font-bold text-white">
                    {formatMoney(Number(order.plan.priceMonthly))}/mo
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-steel-faint">Provisioned</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <ButtonLink href={manageable ? `/dashboard/servers/${order.id}` : "/dashboard"} size="sm">
                  Manage server <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-steel backdrop-blur-sm">
                  {order.status === "GRACE_PERIOD" && order.deleteAfterAt
                    ? `Suspended in grace period. Scheduled for deletion ${formatDate(order.deleteAfterAt)}.`
                    : liveMessage ??
                      (order.status === "FAILED" && order.errorMessage
                        ? normalizePterodactylMessage(order.errorMessage)
                        : "Open the server dashboard for console, files, backups, and settings.")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );

    return manageable ? (
      <Link key={order.id} href={`/dashboard/servers/${order.id}`} className="block">
        {card}
      </Link>
    ) : (
      <div key={order.id}>{card}</div>
    );
  };
  const renderCompactServerRow = (order: (typeof orders)[number]) => {
    const game = GAMES.find((entry) => entry.slug === order.plan.gameSlug);
    const manageable = order.productType === "GAME_SERVER" && order.pteroServerIdentifier;
    const liveStatus = liveStatuses.get(order.id);
    const displayStatus =
      liveStatus ??
      (orderStatusMap[order.status] as LiveDashboardStatus | undefined) ??
      "offline";
    const liveMessage = liveStatusMessage(displayStatus);

    const row = (
      <Card glow={Boolean(manageable)} className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.92))]">
        <CardBody className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-extrabold text-white shadow-card"
            style={{
              background: `linear-gradient(135deg, ${game?.accent ?? "#2F6BFF"} 0%, ${game?.accent2 ?? "#38BDF8"} 100%)`,
            }}
          >
            {(game?.name ?? order.plan.name).slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display text-lg font-bold text-white">{order.serverName}</p>
              {game?.badge ? <Badge tone="violet">{game.badge}</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-steel-faint">
              {order.plan.name} | {formatMoney(Number(order.plan.priceMonthly))}/mo
            </p>
            {order.status === "GRACE_PERIOD" && order.deleteAfterAt && (
              <p className="mt-1 text-xs text-warning">
                Suspended during grace period. Final deletion is scheduled for {formatDate(order.deleteAfterAt)}.
              </p>
            )}
            {liveMessage ? <p className="mt-1 line-clamp-2 text-xs text-steel">{liveMessage}</p> : null}
            {!liveMessage && order.status === "FAILED" && order.errorMessage && (
              <p className="mt-1 line-clamp-2 text-xs text-danger">
                {normalizePterodactylMessage(order.errorMessage)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {order.productType !== "GAME_SERVER" ? (
              <Badge tone="violet">
                {order.status === "MANUAL" ? "Being set up" : order.status}
              </Badge>
            ) : (
              <StatusBadge status={displayStatus} />
            )}
            {manageable && <span className="text-sm font-semibold text-hyper-300">Manage</span>}
          </div>
        </CardBody>
      </Card>
    );

    return manageable ? (
      <Link key={order.id} href={`/dashboard/servers/${order.id}`} className="block">
        {row}
      </Link>
    ) : (
      <div key={order.id}>{row}</div>
    );
  };
  const featuredServerCard = featuredOrder ? renderServerCard(featuredOrder) : null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.9))] px-4 py-3 shadow-card">
          <div className="rounded-xl bg-hyper-500/10 p-2 text-hyper-300">
            <Search className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-steel-faint">Quick Search</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-steel-dim">
              <Link href="/games" className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 transition-colors hover:border-hyper-500/30 hover:text-white">
                Browse games
              </Link>
              <Link href="/dashboard/tickets" className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 transition-colors hover:border-hyper-500/30 hover:text-white">
                Open support
              </Link>
              <Link href="/dashboard/billing" className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 transition-colors hover:border-hyper-500/30 hover:text-white">
                Billing portal
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.9))] px-4 py-3 shadow-card">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-steel-faint">Active Profile</p>
            <p className="truncate font-display text-lg font-bold text-white">{session!.user.name}</p>
            <p className="truncate text-xs text-steel-dim">{session!.user.email}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hyper-gradient font-display text-lg font-extrabold text-white shadow-glow-sm">
            {firstName.slice(0, 1)}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        {featuredServerCard ?? (
          <Card className="overflow-hidden border-hyper-500/20 bg-[linear-gradient(135deg,rgba(13,19,32,0.96),rgba(9,13,24,0.92))]">
            <CardBody className="relative overflow-hidden px-6 py-7 sm:px-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-hyper-500/20 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-volt/10 blur-3xl" />
              <div className="relative flex h-full flex-col justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-hyper-400/20 bg-hyper-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-hyper-200">
                    <Zap className="h-3.5 w-3.5" />
                    Account Snapshot
                  </div>
                  <h1 className="font-display text-3xl font-extrabold italic text-white sm:text-4xl">
                    Your dashboard, <span className="text-gradient-hyper">{firstName}</span>
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-steel-dim sm:text-base">
                    Servers, billing, and support stay one click away while you get your next deployment ready.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-steel-faint">Servers</p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">{activeGameServers.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-steel-faint">Open Tickets</p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">{openTickets}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-steel-faint">Monthly Spend</p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">{formatMoney(activeSpend)}</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(9,13,24,0.9))]">
          <CardBody className="flex h-full flex-col justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-steel-faint">Explore Next</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">Spin up another world</h2>
              <p className="mt-2 text-sm leading-6 text-steel-dim">
                Browse high-demand games, upgrade a current community, or launch something new in minutes.
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {spotlightGames.slice(0, 3).map((game) => (
                <div key={game.slug} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="relative h-14 w-20 overflow-hidden rounded-xl">
                    <Image src={gameCapsule(game.slug)} alt={game.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold text-white">{game.name}</p>
                    <p className="truncate text-xs text-steel-dim">{game.tagline}</p>
                  </div>
                  {game.badge ? <Badge tone="violet">{game.badge}</Badge> : null}
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <ButtonLink href="/games" size="sm" className="flex-1">
                <Plus className="h-4 w-4" /> Browse games
              </ButtonLink>
              <ButtonLink href="/dashboard/tickets" size="sm" variant="secondary" className="flex-1">
                <LifeBuoy className="h-4 w-4" /> Support
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      </div>

      {otherOrders.length > 0 && (
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold italic text-white">
              Your <span className="text-gradient-hyper">fleet</span>
            </h2>
            <p className="mt-1 text-sm text-steel-dim">Use full control cards by default, or switch to compact rows for a denser list.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              <Link
                href={createDashboardHref("cards")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  serverLayout === "cards"
                    ? "bg-hyper-gradient text-white shadow-glow-sm"
                    : "text-steel-dim hover:text-white"
                }`}
              >
                Cards
              </Link>
              <Link
                href={createDashboardHref("compact")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  serverLayout === "compact"
                    ? "bg-hyper-gradient text-white shadow-glow-sm"
                    : "text-steel-dim hover:text-white"
                }`}
              >
                Compact
              </Link>
            </div>
            <ButtonLink href="/games" size="sm">
              <Plus className="h-4 w-4" /> New server
            </ButtonLink>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <Card className="overflow-hidden border-hyper-500/20 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(7,10,18,0.92))]">
          <CardBody className="relative py-16 text-center">
            <div className="pointer-events-none absolute inset-x-1/2 top-6 h-40 w-40 -translate-x-1/2 rounded-full bg-hyper-500/15 blur-3xl" />
            <Server className="mx-auto h-10 w-10 text-steel-faint" />
            <p className="mt-4 font-display text-lg font-bold text-white">No servers yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-steel-dim">
              Deploy your first game server and it will show up here with live stats, console, and file access.
            </p>
            <div className="mt-6">
              <ButtonLink href="/games">Browse games</ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <div className={serverLayout === "compact" ? "space-y-3" : "space-y-4"}>
            {otherOrders.map((order) =>
              serverLayout === "compact" ? renderCompactServerRow(order) : renderServerCard(order),
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,22,0.9))]">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-steel-faint">Recommended Games</p>
                    <h3 className="mt-2 font-display text-xl font-bold text-white">Ready to deploy</h3>
                  </div>
                  <ButtonLink href="/games" variant="secondary" size="sm">
                    All Games
                  </ButtonLink>
                </div>
                <div className="mt-5 space-y-3">
                  {spotlightGames.map((game) => (
                    <Link key={game.slug} href={`/game-servers/${game.slug}`} className="block">
                      <div className="group overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] transition-all duration-200 hover:border-hyper-500/30 hover:bg-white/[0.05]">
                        <div className="relative h-28">
                          <Image
                            src={gameHero(game.slug)}
                            alt={game.name}
                            fill
                            className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-[1.03]"
                            sizes="360px"
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(180deg, transparent 0%, rgba(5,7,13,0.8) 100%), linear-gradient(135deg, ${game.accent}30 0%, transparent 55%)`,
                            }}
                          />
                          <div className="absolute left-3 top-3">
                            {game.badge ? <Badge tone="violet">{game.badge}</Badge> : <Badge tone="blue">{game.name}</Badge>}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-display text-lg font-bold text-white">{game.name}</p>
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                                  style={{
                                    background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})`,
                                  }}
                                >
                                  {game.categories[0]}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-steel-dim">{game.shortDescription}</p>
                              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-hyper-300">
                                Starting at {formatMoney(game.pricePerUnit)}/{game.pricingUnit}
                              </p>
                            </div>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-hyper-300 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,22,0.9))]">
              <CardBody>
                <p className="text-[11px] uppercase tracking-[0.22em] text-steel-faint">Quick Access</p>
                <div className="mt-4 space-y-3">
                  <Link href="/dashboard/billing" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-hyper-500/10 p-2 text-hyper-300">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Billing Portal</p>
                        <p className="text-xs text-steel-dim">Update payment methods and invoices.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-hyper-300" />
                  </Link>
                  <Link href="/dashboard/tickets" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-success/10 p-2 text-success">
                        <LifeBuoy className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Support Center</p>
                        <p className="text-xs text-steel-dim">
                          {openTickets > 0 ? `${openTickets} open conversation${openTickets === 1 ? "" : "s"}.` : "No open tickets right now."}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-hyper-300" />
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
