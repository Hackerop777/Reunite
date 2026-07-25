import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET  /api/chat/[roomId]/messages — list messages in a room.
 * POST /api/chat/[roomId]/messages — persist a message.
 *
 * Both verify the current user is a participant of the room.
 * (In this Vercel edition, the client polls GET every 3s via TanStack
 * Query's refetchInterval — no Socket.io relay. This route persists to
 * the DB so history survives reloads and is picked up by the next poll.)
 */
async function getRoomForUser(roomId: string, userId: string) {
  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      lostUser: true,
      foundUser: true,
      match: { include: { lostTicket: true, foundTicket: true } },
    },
  });
  if (!room) return null;
  if (room.lostUserId !== userId && room.foundUserId !== userId) return null;
  return room;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { roomId } = await params;

  const room = await getRoomForUser(roomId, user.id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const messages = await db.message.findMany({
    where: { chatRoomId: roomId },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: { sender: true },
  });

  const iAmLost = room.lostUserId === user.id;
  const other = iAmLost ? room.foundUser : room.lostUser;
  const myTicket = iAmLost ? room.match.lostTicket : room.match.foundTicket;
  const otherTicket = iAmLost ? room.match.foundTicket : room.match.lostTicket;

  return NextResponse.json({
    room: {
      id: room.id,
      matchId: room.matchId,
      score: room.match.score,
      level: room.match.level,
      myTicketType: myTicket.type,
      myTicket: {
        id: myTicket.id,
        category: myTicket.category,
        color: myTicket.color,
        brand: myTicket.brand,
      },
      otherTicket: {
        id: otherTicket.id,
        category: otherTicket.category,
        color: otherTicket.color,
        brand: otherTicket.brand,
      },
      otherUser: {
        id: other.id,
        name: other.name,
        department: other.department,
        year: other.year,
        avatarColor: other.avatarColor,
      },
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.name,
      content: m.content,
      createdAt: m.createdAt,
      isMine: m.senderId === user.id,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { roomId } = await params;

  const room = await getRoomForUser(roomId, user.id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const message = await db.message.create({
    data: {
      chatRoomId: roomId,
      senderId: user.id,
      content,
    },
    include: { sender: true },
  });

  // Notify the other party about the new message.
  const otherUserId = room.lostUserId === user.id ? room.foundUserId : room.lostUserId;
  await db.notification.create({
    data: {
      userId: otherUserId,
      type: "NEW_MESSAGE",
      title: "New message",
      body: `${message.sender.name}: ${content.slice(0, 80)}${content.length > 80 ? "…" : ""}`,
      link: `/chats`,
    },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.name,
      content: message.content,
      createdAt: message.createdAt,
      isMine: true,
    },
  });
}
