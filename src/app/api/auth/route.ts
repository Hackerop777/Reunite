import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AUTH_COOKIE, getCurrentUser } from "@/lib/auth";
import { AVATAR_COLORS, DEPARTMENTS, YEARS } from "@/lib/constants";

/** GET /api/auth — return current simulated user or null. */
export async function GET() {
  // Uses getCurrentUser so it honors the `x-lf-uid` header (iframe/preview)
  // in addition to the cookie.
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

/** POST /api/auth/profile — create or load a profile by roll number, set cookie. */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, rollNumber, department, year } = body;
  if (!name || !rollNumber || !department || !year) {
    return NextResponse.json(
      { error: "name, rollNumber, department, year are required" },
      { status: 400 }
    );
  }
  if (!DEPARTMENTS.includes(department)) {
    return NextResponse.json({ error: "Invalid department" }, { status: 400 });
  }
  if (!YEARS.includes(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  // If a user with this roll number exists, load them (simulated re-login).
  let user = await db.user.findUnique({ where: { rollNumber: String(rollNumber) } });
  if (!user) {
    const avatarColor = AVATAR_COLORS[
      Math.floor(Math.random() * AVATAR_COLORS.length)
    ];
    user = await db.user.create({
      data: {
        name: String(name),
        rollNumber: String(rollNumber),
        department: String(department),
        year: String(year),
        avatarColor,
      },
    });
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        name: String(name),
        department: String(department),
        year: String(year),
      },
    });
  }

  const store = await cookies();
  store.set(AUTH_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return NextResponse.json({ user });
}

/** DELETE /api/auth/logout — clear the cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  return NextResponse.json({ ok: true });
}
