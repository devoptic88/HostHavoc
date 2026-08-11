import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createPaymenterOrder,
  findOrCreatePaymenterProduct,
  findOrCreatePaymenterUser,
  paymenterConfigured,
} from "@/lib/paymenter";
import { gameBySlug, resolveExistingGamePlan, resolveFixedPlan, resolveGamePlan } from "@/lib/plans";
import { provisionOrder } from "@/lib/provision";

function normalizeRustCheckoutProfile(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["vanilla", "staging", "oxide"].includes(normalized) ? normalized : "vanilla";
}

function normalizeTier(value: unknown) {
  return String(value ?? "").trim().toUpperCase() === "LITE" ? "LITE" : "PRO";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const serverName = String(body?.serverName ?? "").trim().slice(0, 60);
  if (!serverName) {
    return NextResponse.json({ error: "Give your server a name." }, { status: 400 });
  }

  let plan;
  let locationId: number | null = null;
  let rustInstallProfile: string | null = null;
  let minecraftEulaAcceptedAt: Date | null = null;
  try {
    if (body.product === "vps" || body.product === "dedicated") {
      plan = await resolveFixedPlan(
        body.product === "vps" ? "VPS" : "DEDICATED",
        String(body.plan),
      );
    } else {
      const game = gameBySlug(String(body.game));
      if (!game) throw new Error("Unknown game");
      plan = body.plan
        ? await resolveExistingGamePlan(game, String(body.plan))
        : await resolveGamePlan(game, Number(body.units), normalizeTier(body.tier));
      locationId = Number.isFinite(Number(body.location)) && Number(body.location) > 0
        ? Number(body.location)
        : null;
      if (game.slug === "rust") {
        rustInstallProfile = normalizeRustCheckoutProfile(body.rustProfile);
      }
      if (game.slug === "minecraft") {
        // Mojang requires the server operator to accept their EULA. We record
        // the customer's acceptance here and only then write eula=true during
        // provisioning — we never agree on their behalf.
        if (body.minecraftEulaAccepted !== true) {
          throw new Error("You must accept the Minecraft EULA to deploy a Minecraft server.");
        }
        minecraftEulaAcceptedAt = new Date();
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid configuration" },
      { status: 400 },
    );
  }

  const order = await db.order.create({
    data: {
      userId: session.user.id,
      planId: plan.id,
      productType: plan.productType,
      serverName,
      locationId,
      status: "PENDING",
      rustInstallProfile,
      minecraftEulaAcceptedAt,
    },
  });

  // Dev fallback: without Paymenter configured, provision immediately so the
  // full pipeline can be exercised locally. Replace by configuring PAYMENTER_*.
  if (!(await paymenterConfigured())) {
    provisionOrder(order.id).catch(() => {});
    return NextResponse.json({ redirect: `/checkout/success?order=${order.id}` });
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const paymenterUserId = await findOrCreatePaymenterUser(user);
  const paymenterProductId = await findOrCreatePaymenterProduct(plan);
  const { paymenterOrderId, paymentUrl } = await createPaymenterOrder(
    paymenterUserId,
    paymenterProductId,
    order.id,
  );

  await db.order.update({ where: { id: order.id }, data: { paymenterOrderId } });

  return NextResponse.json({ redirect: paymentUrl });
}
