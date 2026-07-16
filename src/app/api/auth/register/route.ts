import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!name || !email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Provide a name, valid email, and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const isFirstUser = (await db.user.count()) === 0;
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      // First registered account becomes the platform admin.
      role: isFirstUser ? "ADMIN" : "CUSTOMER",
    },
  });

  return NextResponse.json({ ok: true, id: user.id });
}
