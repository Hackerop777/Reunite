import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/matches
 * Returns all matches where the current user owns EITHER side,
 * with both tickets + score + level + chat room info.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ matches: [] });
  }

  // Find matches where the user owns the lost or found ticket.
  const lostMatches = await db.match.findMany({
    where: { lostTicket: { userId: user.id } },
    include: {
      lostTicket: { include: { user: true } },
      foundTicket: { include: { user: true } },
      chatRoom: true,
    },
  });
  const foundMatches = await db.match.findMany({
    where: { foundTicket: { userId: user.id } },
    include: {
      lostTicket: { include: { user: true } },
      foundTicket: { include: { user: true } },
      chatRoom: true,
    },
  });

  const all = [...lostMatches, ...foundMatches];

  // Deduplicate (a user could theoretically own both sides — unlikely).
  const seen = new Set<string>();
  const matches = all
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .filter((m) => m.lostTicket.status === "ACTIVE" && m.foundTicket.status === "ACTIVE")
    .map((m) => {
      const iAmLost = m.lostTicket.userId === user.id;
      const myTicket = iAmLost ? m.lostTicket : m.foundTicket;
      const otherTicket = iAmLost ? m.foundTicket : m.lostTicket;
      const otherUser = otherTicket.user;
      return {
        matchId: m.id,
        score: m.score,
        level: m.level,
        status: m.status,
        createdAt: m.createdAt,
        hasChat: !!m.chatRoom,
        chatRoomId: m.chatRoom?.id ?? null,
        myTicket: {
          id: myTicket.id,
          type: myTicket.type,
          category: myTicket.category,
          color: myTicket.color,
          brand: myTicket.brand,
          size: myTicket.size,
          location: myTicket.location,
          date: myTicket.date,
          imageUrl: myTicket.imageUrl,
          description: myTicket.description,
        },
        otherTicket: {
          id: otherTicket.id,
          type: otherTicket.type,
          category: otherTicket.category,
          color: otherTicket.color,
          brand: otherTicket.brand,
          size: otherTicket.size,
          location: otherTicket.location,
          date: otherTicket.date,
          imageUrl: otherTicket.imageUrl,
          description: otherTicket.description,
        },
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          department: otherUser.department,
          year: otherUser.year,
          avatarColor: otherUser.avatarColor,
        },
      };
    })
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ matches });
}
