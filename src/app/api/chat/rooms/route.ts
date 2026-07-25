import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/chat/rooms
 * Returns all chat rooms the current user is part of, with the other
 * party's identity (revealed — chat is the trust boundary) + the most
 * recent message for preview.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ rooms: [] });

  const rooms = await db.chatRoom.findMany({
    where: {
      OR: [{ lostUserId: user.id }, { foundUserId: user.id }],
    },
    include: {
      lostUser: true,
      foundUser: true,
      match: {
        include: { lostTicket: true, foundTicket: true },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const safe = rooms
    .map((r) => {
      const iAmLost = r.lostUserId === user.id;
      const other = iAmLost ? r.foundUser : r.lostUser;
      const myTicket = iAmLost ? r.match.lostTicket : r.match.foundTicket;
      const otherTicket = iAmLost ? r.match.foundTicket : r.match.lostTicket;
      const lastMsg = r.messages[0];
      return {
        id: r.id,
        matchId: r.matchId,
        createdAt: r.createdAt,
        score: r.match.score,
        level: r.match.level,
        otherUser: {
          id: other.id,
          name: other.name,
          department: other.department,
          year: other.year,
          avatarColor: other.avatarColor,
        },
        myTicketType: myTicket.type,
        myTicketCategory: myTicket.category,
        otherTicketCategory: otherTicket.category,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              senderId: lastMsg.senderId,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return tb - ta;
    });

  return NextResponse.json({ rooms: safe });
}
