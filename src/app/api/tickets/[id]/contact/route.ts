import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/tickets/[id]/contact
 * Body: { matchId: string }
 *
 * Opens a private chat room for a specific match. Only the owner of the
 * LOST ticket OR the owner of the FOUND ticket may open it. If a room
 * already exists for this match, it's reused.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty */
  }
  const matchId = body.matchId;
  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { lostTicket: true, foundTicket: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Verify the ticket id in the path is part of this match.
  if (match.lostTicketId !== id && match.foundTicketId !== id) {
    return NextResponse.json({ error: "Ticket does not belong to this match" }, { status: 400 });
  }

  // Verify the current user owns one of the two tickets.
  const isLostOwner = match.lostTicket.userId === user.id;
  const isFoundOwner = match.foundTicket.userId === user.id;
  if (!isLostOwner && !isFoundOwner) {
    return NextResponse.json({ error: "Not authorized to contact for this match" }, { status: 403 });
  }

  // Reuse existing chat room for this match if present.
  let room = await db.chatRoom.findUnique({
    where: { matchId: match.id },
  });
  if (!room) {
    room = await db.chatRoom.create({
      data: {
        matchId: match.id,
        ticketId: id,
        lostUserId: match.lostTicket.userId,
        foundUserId: match.foundTicket.userId,
      },
    });
    // Mark the match as contacted.
    await db.match.update({
      where: { id: match.id },
      data: { status: "CONTACTED" },
    });

    // Notify the OTHER party that contact was initiated.
    const otherUserId = isLostOwner ? match.foundTicket.userId : match.lostTicket.userId;
    await db.notification.create({
      data: {
        userId: otherUserId,
        type: "NEW_MESSAGE",
        title: "Someone opened a chat with you",
        body: `A match on your ${isLostOwner ? "found" : "lost"} item just started a private chat. Open the Chats tab to reply.`,
        link: `/chats`,
      },
    });
  }

  return NextResponse.json({
    chatRoom: {
      id: room.id,
      matchId: room.matchId,
      lostUserId: room.lostUserId,
      foundUserId: room.foundUserId,
    },
  });
}
