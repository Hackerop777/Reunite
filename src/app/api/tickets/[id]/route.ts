import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/tickets/[id] — full detail + matches for this ticket. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Gather all matches involving this ticket (both as lost & found),
  // with the opposite-side ticket + reporter info.
  const lostMatches = await db.match.findMany({
    where: { lostTicketId: id },
    include: { foundTicket: { include: { user: true } } },
  });
  const foundMatches = await db.match.findMany({
    where: { foundTicketId: id },
    include: { lostTicket: { include: { user: true } } },
  });

  const matches = [
    ...lostMatches.map((m) => ({
      matchId: m.id,
      score: m.score,
      level: m.level,
      status: m.status,
      oppositeTicket: m.foundTicket,
      oppositeUser: m.foundTicket.user,
      createdAt: m.createdAt,
    })),
    ...foundMatches.map((m) => ({
      matchId: m.id,
      score: m.score,
      level: m.level,
      status: m.status,
      oppositeTicket: m.lostTicket,
      oppositeUser: m.lostTicket.user,
      createdAt: m.createdAt,
    })),
  ].sort((a, b) => b.score - a.score);

  const isMine = user ? ticket.userId === user.id : false;

  // Privacy: only reveal full reporter identity to the owner.
  // Others only get an initial + avatar color.
  const safeUser = isMine
    ? {
        id: ticket.user.id,
        name: ticket.user.name,
        rollNumber: ticket.user.rollNumber,
        department: ticket.user.department,
        year: ticket.user.year,
        avatarColor: ticket.user.avatarColor,
      }
    : {
        id: ticket.user.id,
        name: null,
        rollNumber: null,
        department: ticket.user.department,
        year: ticket.user.year,
        avatarColor: ticket.user.avatarColor,
        initial: ticket.user.name.charAt(0).toUpperCase(),
      };

  const safeMatches = matches.map((m) => {
    const oppositeIsMine = user ? m.oppositeUser.id === user.id : false;
    return {
      matchId: m.matchId,
      score: m.score,
      level: m.level,
      status: m.status,
      createdAt: m.createdAt,
      oppositeTicket: {
        id: m.oppositeTicket.id,
        type: m.oppositeTicket.type,
        category: m.oppositeTicket.category,
        color: m.oppositeTicket.color,
        brand: m.oppositeTicket.brand,
        size: m.oppositeTicket.size,
        location: m.oppositeTicket.location,
        date: m.oppositeTicket.date,
        imageUrl: m.oppositeTicket.imageUrl,
        description: m.oppositeTicket.description,
        status: m.oppositeTicket.status,
        createdAt: m.oppositeTicket.createdAt,
      },
      oppositeUser: oppositeIsMine
        ? {
            id: m.oppositeUser.id,
            name: m.oppositeUser.name,
            rollNumber: m.oppositeUser.rollNumber,
            department: m.oppositeUser.department,
            avatarColor: m.oppositeUser.avatarColor,
          }
        : {
            id: m.oppositeUser.id,
            department: m.oppositeUser.department,
            avatarColor: m.oppositeUser.avatarColor,
            initial: m.oppositeUser.name.charAt(0).toUpperCase(),
          },
    };
  });

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      type: ticket.type,
      category: ticket.category,
      color: ticket.color,
      brand: ticket.brand,
      size: ticket.size,
      location: ticket.location,
      date: ticket.date,
      imageUrl: ticket.imageUrl,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.createdAt,
      expiresAt: ticket.expiresAt,
      isMine,
    },
    user: safeUser,
    matches: safeMatches,
  });
}
