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
  const orderId = String(formData.get("orderId") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 40);
  if (!subject || !body) throw new Error("Subject and message are required");

  let contextPrefix = "";
  if (orderId) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { plan: true },
    });
    if (order && order.userId === session.user.id) {
      const contextLines = [
        "Server Context",
        `Server Name: ${order.serverName}`,
        `Order ID: ${order.id}`,
        `Plan: ${order.plan.name}`,
      ];
      if (topic) contextLines.push(`Topic: ${topic}`);
      contextPrefix = `${contextLines.join("\n")}\n\n`;
    }
  }

  const ticket = await db.ticket.create({
    data: {
      userId: session.user.id,
      subject,
      priority: ["LOW", "MEDIUM", "HIGH"].includes(priority)
        ? (priority as "LOW" | "MEDIUM" | "HIGH")
        : "MEDIUM",
      messages: {
        create: {
          authorId: session.user.id,
          body: `${contextPrefix}${body}`,
          fromStaff: false,
        },
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
