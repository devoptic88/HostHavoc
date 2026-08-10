import Image from "next/image";
import { Moon, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";
import { GAMES, gameHero } from "@/content/games";
import { accountUsage } from "@/lib/accountUsage";
import { formatDate } from "@/lib/utils";
import { wakeServer } from "../actions";

export const dynamic = "force-dynamic";

export default async function SavedServersPage() {
  const session = await auth();
  const [saved, usage] = await Promise.all([
    db.order.findMany({
      where: { userId: session!.user.id, status: "HIBERNATING" },
      include: { plan: true },
      orderBy: { hibernatedAt: "desc" },
    }),
    accountUsage(session!.user.id),
  ]);

  const slotsFull = usage.deployed >= usage.deploySlots;
  const hasWaking = saved.some((order) => order.hibernationPending);

  return (
    <div className="mx-auto max-w-7xl">
      {hasWaking && <AutoRefresh intervalMs={2500} />}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-steel-dim">
            <Moon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold italic text-white">
              Saved <span className="text-gradient-hyper">servers</span>{" "}
              <span className="text-base font-semibold not-italic text-steel-faint">
                ({usage.saved}/{usage.saveSlots})
              </span>
            </h1>
            <p className="mt-1 text-sm text-steel-dim">
              Wake an instance to resume playing — it re-deploys onto a slot with your world and
              configs restored, which takes a few minutes.
            </p>
          </div>
        </div>
      </div>

      {saved.length === 0 ? (
        <Card className="overflow-hidden border-hyper-500/20 bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(7,10,18,0.92))]">
          <CardBody className="relative py-16 text-center">
            <div className="pointer-events-none absolute inset-x-1/2 top-6 h-40 w-40 -translate-x-1/2 rounded-full bg-hyper-500/15 blur-3xl" />
            <Moon className="mx-auto h-10 w-10 text-steel-faint" />
            <p className="mt-4 font-display text-lg font-bold text-white">No saved servers</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-steel-dim">
              LITE servers you put to sleep show up here. They keep their world and configs, free
              up a deploy slot while parked, and wake straight back where you left off.
            </p>
            <div className="mt-6">
              <ButtonLink href="/games">Browse games</ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {slotsFull && (
            <Card className="border-warning/30">
              <CardBody className="flex flex-wrap items-center gap-3 py-4 text-sm text-steel">
                <Sparkles className="h-4 w-4 shrink-0 text-warning" />
                All {usage.deploySlots} of your deploy slots are in use. Hibernate a running server
                or buy another slot before waking one of these.
              </CardBody>
            </Card>
          )}
          {saved.map((order) => {
            const game = GAMES.find((entry) => entry.slug === order.plan.gameSlug);
            return (
              <Card key={order.id} glow className="overflow-hidden border-white/10 bg-night-100/95">
                <div className="relative min-h-[160px]">
                  {game && (
                    <>
                      <Image
                        src={gameHero(game.slug)}
                        alt={game.name}
                        fill
                        className="object-cover opacity-30"
                        sizes="(min-width: 1280px) 900px, 100vw"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(120deg, ${game.accent}44 0%, rgba(5,7,13,0.35) 24%, rgba(5,7,13,0.94) 72%), linear-gradient(180deg, rgba(5,7,13,0.3) 0%, rgba(5,7,13,0.94) 100%)`,
                        }}
                      />
                    </>
                  )}
                  <div className="relative flex h-full min-h-[160px] flex-col justify-between p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone="blue">{game?.name ?? order.plan.name}</Badge>
                          <Badge tone="violet">Lite</Badge>
                        </div>
                        <h3 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                          {order.serverName}
                        </h3>
                        <p className="mt-1.5 text-xs text-steel">
                          {order.plan.name}
                          {order.hibernatedAt
                            ? ` · Sleeping since ${formatDate(order.hibernatedAt)}`
                            : ""}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-steel-dim">
                        <span className="h-1.5 w-1.5 rounded-full bg-steel-faint" />
                        {order.hibernationPending ? "Waking" : "Hibernating"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {order.hibernationPending ? (
                        <div className="ring-focus w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 sm:max-w-sm">
                          <ProgressBar
                            percent={order.hibernationProgress}
                            label={order.hibernationStage ?? "Waking…"}
                          />
                        </div>
                      ) : (
                        <>
                          <form action={wakeServer}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <SubmitButton variant="primary" pendingLabel="Waking…">
                              Wake &amp; play
                            </SubmitButton>
                          </form>
                          <p className="text-xs text-steel-faint">
                            Waking uses one deploy slot ({usage.deployed}/{usage.deploySlots} in
                            use).
                          </p>
                        </>
                      )}
                    </div>
                    {order.errorMessage && !order.hibernationPending && (
                      <p className="mt-2 text-xs text-danger">{order.errorMessage}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
