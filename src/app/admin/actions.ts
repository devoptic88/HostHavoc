"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { pteroApp } from "@/lib/pterodactyl";
import {
  provisionOrder,
  suspendOrder,
  terminateOrder,
  unsuspendOrder,
} from "@/lib/provision";
import { slugify } from "@/lib/utils";

// ─── Orders ─────────────────────────────────────────────────────────────

export async function retryProvision(formData: FormData) {
  await requireAdmin();
  await provisionOrder(String(formData.get("orderId"))).catch(() => {});
  revalidatePath("/admin/orders");
}

export async function adminSuspend(formData: FormData) {
  await requireAdmin();
  await suspendOrder(String(formData.get("orderId")));
  revalidatePath("/admin/orders");
}

export async function adminUnsuspend(formData: FormData) {
  await requireAdmin();
  await unsuspendOrder(String(formData.get("orderId")));
  revalidatePath("/admin/orders");
}

export async function adminTerminate(formData: FormData) {
  await requireAdmin();
  await terminateOrder(String(formData.get("orderId")));
  revalidatePath("/admin/orders");
}

export async function markOrderActive(formData: FormData) {
  await requireAdmin();
  await db.order.update({
    where: { id: String(formData.get("orderId")) },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/admin/orders");
}

// ─── Plans ──────────────────────────────────────────────────────────────

export async function updatePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("planId"));
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const eggId = num("eggId");
  const nestId = num("nestId");

  await db.plan.update({
    where: { id },
    data: {
      eggId,
      nestId,
      ramMb: num("ramMb") ?? undefined,
      cpuPercent: num("cpuPercent") ?? undefined,
      diskMb: num("diskMb") ?? undefined,
      priceMonthly: num("price") ?? undefined,
    },
  });

  // Optionally propagate the egg mapping to every plan of the same game.
  const plan = await db.plan.findUnique({ where: { id } });
  if (formData.get("applyToGame") && plan?.gameSlug && eggId && nestId) {
    await db.plan.updateMany({
      where: { gameSlug: plan.gameSlug },
      data: { eggId, nestId },
    });
  }
  revalidatePath("/admin/plans");
}

// ─── Customers ──────────────────────────────────────────────────────────

export async function toggleRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("userId"));
  if (id === admin.id) throw new Error("You can't demote yourself");
  const user = await db.user.findUniqueOrThrow({ where: { id } });
  await db.user.update({
    where: { id },
    data: { role: user.role === "ADMIN" ? "CUSTOMER" : "ADMIN" },
  });
  revalidatePath("/admin/customers");
}

// ─── Pterodactyl: servers ───────────────────────────────────────────────

export async function pteroSuspendServer(formData: FormData) {
  await requireAdmin();
  await pteroApp.suspendServer(Number(formData.get("serverId")));
  revalidatePath("/admin/servers");
}

export async function pteroUnsuspendServer(formData: FormData) {
  await requireAdmin();
  await pteroApp.unsuspendServer(Number(formData.get("serverId")));
  revalidatePath("/admin/servers");
}

export async function pteroDeleteServer(formData: FormData) {
  await requireAdmin();
  await pteroApp.deleteServer(Number(formData.get("serverId")));
  revalidatePath("/admin/servers");
}

export async function pteroReinstallServer(formData: FormData) {
  await requireAdmin();
  await pteroApp.reinstallServer(Number(formData.get("serverId")));
  revalidatePath("/admin/servers");
}

// ─── Pterodactyl: locations ─────────────────────────────────────────────

export async function createLocation(formData: FormData) {
  await requireAdmin();
  await pteroApp.createLocation(
    String(formData.get("short")),
    String(formData.get("long") ?? "") || undefined,
  );
  revalidatePath("/admin/locations");
}

export async function deleteLocation(formData: FormData) {
  await requireAdmin();
  await pteroApp.deleteLocation(Number(formData.get("locationId")));
  revalidatePath("/admin/locations");
}

// ─── Pterodactyl: allocations ───────────────────────────────────────────

export async function createAllocations(formData: FormData) {
  await requireAdmin();
  const nodeId = Number(formData.get("nodeId"));
  const ip = String(formData.get("ip"));
  const ports = String(formData.get("ports"))
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  await pteroApp.createAllocations(nodeId, ip, ports);
  revalidatePath(`/admin/nodes/${nodeId}`);
}

export async function deleteAllocation(formData: FormData) {
  await requireAdmin();
  const nodeId = Number(formData.get("nodeId"));
  await pteroApp.deleteAllocation(nodeId, Number(formData.get("allocationId")));
  revalidatePath(`/admin/nodes/${nodeId}`);
}

// ─── Content: blog ──────────────────────────────────────────────────────

export async function savePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("postId") ?? "");
  const data = {
    title: String(formData.get("title") ?? "").slice(0, 160),
    excerpt: String(formData.get("excerpt") ?? "").slice(0, 300),
    body: String(formData.get("body") ?? ""),
    published: formData.get("published") === "on",
  };
  if (!data.title || !data.body) throw new Error("Title and body required");

  if (id) {
    await db.post.update({ where: { id }, data });
  } else {
    await db.post.create({
      data: { ...data, slug: slugify(data.title) || `post-${Date.now()}` },
    });
  }
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  await db.post.delete({ where: { id: String(formData.get("postId")) } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

// ─── Content: wiki ──────────────────────────────────────────────────────

export async function saveArticle(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("articleId") ?? "");
  const data = {
    title: String(formData.get("title") ?? "").slice(0, 160),
    category: slugify(String(formData.get("category") ?? "general")) || "general",
    body: String(formData.get("body") ?? ""),
    published: formData.get("published") === "on",
  };
  if (!data.title || !data.body) throw new Error("Title and body required");

  if (id) {
    await db.article.update({ where: { id }, data });
  } else {
    await db.article.create({
      data: { ...data, slug: slugify(data.title) || `article-${Date.now()}` },
    });
  }
  revalidatePath("/admin/wiki");
  revalidatePath("/wiki");
  redirect("/admin/wiki");
}

export async function deleteArticle(formData: FormData) {
  await requireAdmin();
  await db.article.delete({ where: { id: String(formData.get("articleId")) } });
  revalidatePath("/admin/wiki");
  revalidatePath("/wiki");
}
