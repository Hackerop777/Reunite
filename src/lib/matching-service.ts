import { db } from "@/lib/db";
import { findMatches, type MatchableTicket, type MatchResult } from "@/lib/matching";

/**
 * When a new ticket is created, run the matching engine against all
 * ACTIVE tickets of the OPPOSITE type, persist Match rows for any
 * score >= 60, and notify BOTH the new ticket's owner and the matched
 * ticket's owner.
 *
 * Returns the persisted matches (with level >= POSSIBLE).
 */
export async function runMatchingForNewTicket(newTicketId: string) {
  const ticket = await db.ticket.findUnique({ where: { id: newTicketId } });
  if (!ticket) return [];

  const oppositeType = ticket.type === "LOST" ? "FOUND" : "LOST";

  // Candidate pool: opposite-type, ACTIVE, not owned by the same user.
  const candidatesRaw = await db.ticket.findMany({
    where: {
      type: oppositeType,
      status: "ACTIVE",
      userId: { not: ticket.userId },
    },
  });

  const source: MatchableTicket = {
    id: ticket.id,
    type: ticket.type as "LOST" | "FOUND",
    category: ticket.category,
    color: ticket.color,
    brand: ticket.brand,
    size: ticket.size,
    location: ticket.location,
    date: ticket.date,
  };

  const pool: MatchableTicket[] = candidatesRaw.map((c) => ({
    id: c.id,
    type: c.type as "LOST" | "FOUND",
    category: c.category,
    color: c.color,
    brand: c.brand,
    size: c.size,
    location: c.location,
    date: c.date,
  }));

  const results: MatchResult[] = findMatches(source, pool);

  const created = [];
  for (const r of results) {
    const lostTicketId = ticket.type === "LOST" ? ticket.id : r.ticketId;
    const foundTicketId = ticket.type === "FOUND" ? ticket.id : r.ticketId;
    const lostTicket = ticket.type === "LOST" ? ticket : candidatesRaw.find((c) => c.id === r.ticketId)!;
    const foundTicket = ticket.type === "FOUND" ? ticket : candidatesRaw.find((c) => c.id === r.ticketId)!;

    // Avoid duplicate match rows.
    const existing = await db.match.findFirst({
      where: { lostTicketId, foundTicketId },
    });
    if (existing) {
      // Update score/level in case the engine improved.
      await db.match.update({
        where: { id: existing.id },
        data: { score: r.score, level: r.level },
      });
      continue;
    }

    const match = await db.match.create({
      data: {
        lostTicketId,
        foundTicketId,
        score: r.score,
        level: r.level,
      },
    });

    // Notify the NEW ticket's owner about the matched opposite ticket.
    const levelLabel =
      r.level === "HIGHLY_LIKELY"
        ? "highly likely"
        : r.level === "STRONG"
          ? "strong"
          : "possible";

    await db.notification.create({
      data: {
        userId: ticket.userId,
        type: "MATCH_FOUND",
        title: `${levelLabel.charAt(0).toUpperCase() + levelLabel.slice(1)} match found!`,
        body: `We found a ${oppositeType.toLowerCase()} item that ${levelLabel} matches your ${ticket.type.toLowerCase()} ${ticket.category.toLowerCase()}.`,
        link: `/matches`,
      },
    });

    // Notify the OPPOSITE ticket's owner too.
    const oppositeOwnerId = lostTicket.userId === ticket.userId ? foundTicket.userId : lostTicket.userId;
    await db.notification.create({
      data: {
        userId: oppositeOwnerId,
        type: "MATCH_FOUND",
        title: `${levelLabel.charAt(0).toUpperCase() + levelLabel.slice(1)} match found!`,
        body: `Someone may be looking for the ${oppositeType.toLowerCase()} item you reported.`,
        link: `/matches`,
      },
    });

    created.push(match);
  }

  return created;
}
