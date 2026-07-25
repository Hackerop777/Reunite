import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** PATCH /api/notifications/[id]/read — mark a single notification as read. */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const notif = await db.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.notification.update({
    where: { id },
    data: { read: true },
  });
  return NextResponse.json({ notification: updated });
}
