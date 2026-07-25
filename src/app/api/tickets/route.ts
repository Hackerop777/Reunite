import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, COLORS, LOCATIONS, SIZES, expiryFromNow } from "@/lib/constants";
import { runMatchingForNewTicket } from "@/lib/matching-service";

/** GET /api/tickets?type=LOST|FOUND|ALL&mine=true|false */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "ALL").toUpperCase();
  const mine = searchParams.get("mine") === "true";

  const where: any = { status: "ACTIVE" };
  if (type === "LOST" || type === "FOUND") where.type = type;
  if (mine) {
    if (!user) return NextResponse.json({ tickets: [] });
    where.userId = user.id;
  }

  const tickets = await db.ticket.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Hide reporter identity details from non-owners (per the safety model —
  // identity is only revealed inside a private chat room after contact).
  const safe = tickets.map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    color: t.color,
    brand: t.brand,
    size: t.size,
    location: t.location,
    date: t.date,
    imageUrl: t.imageUrl,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    isMine: user ? t.userId === user.id : false,
    reporterInitial: t.user.name.charAt(0).toUpperCase(),
    reporterAvatarColor: t.user.avatarColor,
  }));

  return NextResponse.json({ tickets: safe });
}

/** POST /api/tickets — create a ticket and trigger matching. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, category, color, brand, size, location, date, imageUrl, description } = body;
  if (!type || (type !== "LOST" && type !== "FOUND")) {
    return NextResponse.json({ error: "type must be LOST or FOUND" }, { status: 400 });
  }
  if (!category || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!color || !COLORS.includes(color)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }
  if (!location || !LOCATIONS.includes(location)) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }
  if (!brand || typeof brand !== "string") {
    return NextResponse.json({ error: "brand is required" }, { status: 400 });
  }
  if (!size || !SIZES.includes(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  // Don't allow future dates for lost/found items.
  if (parsedDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
  }

  // imageUrl is a client-generated JPEG data URL (serverless FS is read-only).
  // Guard against oversized payloads to protect the Postgres text column.
  if (imageUrl && typeof imageUrl === "string" && imageUrl.length > 200000) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  const ticket = await db.ticket.create({
    data: {
      type,
      userId: user.id,
      category,
      color,
      brand: String(brand).trim(),
      size,
      location,
      date: parsedDate,
      imageUrl: imageUrl || null,
      description: description ? String(description).trim() : null,
      expiresAt: expiryFromNow(),
    },
  });

  // Run the matching engine — the heart of the product.
  const newMatches = await runMatchingForNewTicket(ticket.id);

  return NextResponse.json({ ticket, newMatches: newMatches.length });
}
