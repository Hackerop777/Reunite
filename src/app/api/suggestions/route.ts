import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LOCATIONS } from "@/lib/constants";

/**
 * GET /api/suggestions?category=Electronics&location=Library
 *
 * "Did you check here?" — based on historical FOUND ticket data.
 * Returns the top locations where similar items (by category, and optionally
 * near the given location) have been recovered in the past, so the person
 * reporting a LOST item knows where to physically check first.
 *
 * Logic:
 *  - Look at all FOUND tickets of the same category (resolved or active).
 *  - Tally the `location` field.
 *  - Exclude the user's own provided location (they already know that one).
 *  - Return top N with counts, plus a curated fallback list for cold-start.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";

  const where: any = { type: "FOUND" };
  if (category) where.category = category;

  const foundTickets = await db.ticket.findMany({
    where,
    select: { location: true },
  });

  const tally = new Map<string, number>();
  for (const t of foundTickets) {
    if (t.location && t.location !== location) {
      tally.set(t.location, (tally.get(t.location) || 0) + 1);
    }
  }

  const dataDriven = Array.from(tally.entries())
    .map(([name, count]) => ({ name, count, source: "history" as const }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Curated fallback — the most common recovery spots on a campus.
  // Used when there's no historical data yet (cold start).
  const curatedFallbacks = ["Security Office", "Library Reception", "Canteen Counter", "Reception"]
    .filter((l) => l !== location && !dataDriven.find((d) => d.name === l))
    .map((name) => ({ name, count: 0, source: "curated" as const }));

  // Also surface nearby locations to the one provided (heuristic: same first word).
  let nearby: { name: string; count: number; source: "nearby" }[] = [];
  if (location) {
    const firstWord = location.split(" ")[0].toLowerCase();
    nearby = LOCATIONS.filter(
      (l) =>
        l !== location &&
        l.toLowerCase().startsWith(firstWord) &&
        !dataDriven.find((d) => d.name === l) &&
        !curatedFallbacks.find((d) => d.name === l)
    )
      .slice(0, 2)
      .map((name) => ({ name, count: 0, source: "nearby" as const }));
  }

  const locations = [...dataDriven, ...nearby, ...curatedFallbacks].slice(0, 6);

  return NextResponse.json({
    locations,
    hasHistory: foundTickets.length > 0,
  });
}
