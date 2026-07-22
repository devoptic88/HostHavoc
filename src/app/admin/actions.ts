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
import { SETTING_KEYS, setSettings, type SettingKey } from "@/lib/settings";

// ─── Orders ─────────────────────────────────────────────────────────────

export async function retryProvision(formData: FormData) {
  await requireAdmin();
  await provisionOrder(String(formData.get("orderId"))).catch(() => {});
  revalidatePath("/admin/orders");
  revalidatePath("/admin/servers");
}

export async function adminSuspend(formData: FormData) {
  await requireAdmin();
  await suspendOrder(String(formData.get("orderId")));
  revalidatePath("/admin/orders");
  revalidatePath("/admin/servers");
}

export async function adminUnsuspend(formData: FormData) {
  await requireAdmin();
  await unsuspendOrder(String(formData.get("orderId")));
  revalidatePath("/admin/orders");
  revalidatePath("/admin/servers");
}

export async function adminTerminate(formData: FormData) {
  await requireAdmin();
  await terminateOrder(String(formData.get("orderId")));
  revalidatePath("/admin/orders");
  revalidatePath("/admin/servers");
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

function parsePlanForm(formData: FormData) {
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const productType = str("productType") as "GAME_SERVER" | "VPS" | "DEDICATED";
  return {
    productType,
    gameSlug: productType === "GAME_SERVER" ? str("gameSlug") || null : null,
    name: str("name"),
    slots: num("slots"),
    ramMb: num("ramMb") ?? 0,
    cpuPercent: num("cpuPercent") ?? 0,
    diskMb: num("diskMb") ?? 0,
    databases: num("databases") ?? 1,
    backups: num("backups") ?? 2,
    priceMonthly: num("price") ?? 0,
    nestId: num("nestId"),
    eggId: num("eggId"),
    nodeId: num("nodeId"),
    sortOrder: num("sortOrder") ?? 0,
    active: Boolean(formData.get("active")),
  };
}

export async function createPlan(formData: FormData) {
  await requireAdmin();
  const data = parsePlanForm(formData);
  if (!data.name) throw new Error("Plan name is required");
  await db.plan.create({ data });
  revalidatePath("/admin/plans");
}

export async function updatePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("planId"));
  const data = parsePlanForm(formData);
  if (!data.name) throw new Error("Plan name is required");
  await db.plan.update({ where: { id }, data });

  // Optionally propagate the deployment mapping to every plan of the same game.
  if (formData.get("applyToGame") && data.gameSlug && data.eggId && data.nestId) {
    await db.plan.updateMany({
      where: { gameSlug: data.gameSlug, productType: "GAME_SERVER" },
      data: { eggId: data.eggId, nestId: data.nestId, nodeId: data.nodeId },
    });
  }
  revalidatePath("/admin/plans");
}

export async function deletePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("planId"));
  const orders = await db.order.count({ where: { planId: id } });
  if (orders > 0) {
    // Plans with order history can't be removed — retire them instead.
    await db.plan.update({ where: { id }, data: { active: false } });
  } else {
    await db.plan.delete({ where: { id } });
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
  const serverId = Number(formData.get("serverId"));
  await pteroApp.deleteServer(serverId);
  const order = await db.order.findFirst({ where: { pteroServerId: serverId } });
  if (order) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        pteroServerId: null,
        pteroServerIdentifier: null,
        errorMessage: null,
      },
    });
    revalidatePath("/admin/orders");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/servers/${order.id}`);
  }
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

// ─── Settings ───────────────────────────────────────────────────────────

export async function updateSettings(formData: FormData) {
  await requireAdmin();
  const entries: Partial<Record<SettingKey, string>> = {};
  for (const key of SETTING_KEYS) {
    if (formData.get(`${key}__clear`)) {
      entries[key] = ""; // explicit clear removes the DB override
      continue;
    }
    const value = String(formData.get(key) ?? "").trim();
    if (value) entries[key] = value; // blank = keep current value
  }
  await setSettings(entries);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}
