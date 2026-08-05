"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hibernateOrder, wakeOrder } from "@/lib/provision";

async function requireOwnedOrder(orderId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not logged in");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || (order.userId !== session.user.id && session.user.role !== "ADMIN")) {
    throw new Error("Server not found");
  }
  return order;
}

export async function hibernateServer(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  await requireOwnedOrder(orderId);
  await hibernateOrder(orderId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/saves");
}

export async function wakeServer(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  await requireOwnedOrder(orderId);
  await wakeOrder(orderId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/saves");
}
