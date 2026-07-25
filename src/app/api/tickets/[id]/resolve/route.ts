import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * PATCH /api/tickets/[id]/resolve
 * Marks a ticket as RESOLVED. Only the owner may resolve their own ticket.
 * Also marks all related matches as RESOLVED.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (ticket.userId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const updated = await db.ticket.update({
    where: { id },
    data: { status: "RESOLVED" },
  });

  // Resolve all matches involving this ticket.
  await db.match.updateMany({
    where: { OR: [{ lostTicketId: id }, { foundTicketId: id }] },
    data: { status: "RESOLVED" },
  });

  return NextResponse.json({ ticket: updated });
}
