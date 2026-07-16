"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function updateName(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not logged in");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  await db.user.update({ where: { id: session.user.id }, data: { name } });
  revalidatePath("/dashboard/account");
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not logged in");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) throw new Error("New password must be at least 8 characters");

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw new Error("Current password is incorrect");

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  revalidatePath("/dashboard/account");
}
