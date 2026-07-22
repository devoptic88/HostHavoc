"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not logged in");
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  const priority = String(formData.get("priority") ?? "MEDIUM");
  if (!subject || !body) throw new Error("Subject and message are required");

  const ticket = await db.ticket.create({
    data: {
      userId: session.user.id,
      subject,
      priority: ["LOW", "MEDIUM", "HIGH"].includes(priority)
        ? (priority as "LOW" | "MEDIUM" | "HIGH")
        : "MEDIUM",
      messages: {
        create: { authorId: session.user.id, body, fromStaff: false },
      },
    },
  });
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function replyTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not logged in");
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  if (!body) return;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  const isStaff = session.user.role === "ADMIN";
  if (!ticket || (!isStaff && ticket.userId !== session.user.id)) {
    throw new Error("Ticket not found");
  }

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      status: isStaff ? "ANSWERED" : "CUSTOMER_REPLY",
      messages: {
        create: { authorId: session.user.id, body, fromStaff: isStaff },
      },
    },
  });
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets/${ticketId}`);
}

export async function closeTicket(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not logged in");
  const ticketId = String(formData.get("ticketId"));
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || (session.user.role !== "ADMIN" && ticket.userId !== session.user.id)) {
    throw new Error("Ticket not found");
  }
  await db.ticket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets`);
}
