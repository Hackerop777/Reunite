/**
 * Matching Engine — the heart of Reunite.
 *
 * Weighted scoring compares a LOST ticket against FOUND tickets (and vice versa).
 *
 * Weights:
 *   Category 40, Brand 20, Color 15, Size 10, Location 10, Date 5  (total = 100)
 *
 * Score levels:
 *   0–60   → IGNORE (not surfaced)
 *   60–75  → POSSIBLE
 *   75–90  → STRONG
 *   90–99  → HIGHLY_LIKELY
 *   Never returns 100 (ownership still must be verified by faculty/security).
 */

export type TicketType = "LOST" | "FOUND";

export interface MatchableTicket {
  id: string;
  type: TicketType;
  category: string;
  color: string;
  brand: string;
  size: string;
  location: string;
  date: Date | string;
}

export const MATCH_WEIGHTS = {
  category: 40,
  brand: 20,
  color: 15,
  size: 10,
  location: 10,
  date: 5,
} as const;

export type MatchLevel = "POSSIBLE" | "STRONG" | "HIGHLY_LIKELY";

export interface MatchResult {
  ticketId: string;
  score: number; // 0–99
  level: MatchLevel | "IGNORE";
  breakdown: {
    category: number;
    brand: number;
    color: number;
    size: number;
    location: number;
    date: number;
  };
}

/* ------------------------------------------------------------------ *
 * Normalization helpers
 * ------------------------------------------------------------------ */

const normalize = (s: string): string =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normList = (s: string): string[] =>
  normalize(s).split(" ").filter(Boolean);

/* ------------------------------------------------------------------ *
 * Color similarity — handles "dark green" ≈ "green", "navy" ≈ "blue"
 * ------------------------------------------------------------------ */

// Canonical color families + synonyms. Keys are the canonical family.
const COLOR_FAMILIES: Record<string, string[]> = {
  black: ["black", "charcoal", "ebony", "jet"],
  white: ["white", "ivory", "cream", "offwhite", "pearl"],
  gray: ["gray", "grey", "ash", "slate", "silver"],
  red: ["red", "crimson", "maroon", "scarlet", "burgundy", "cherry", "rose", "wine"],
  orange: ["orange", "amber", "rust", "terracotta", "peach", "coral"],
  yellow: ["yellow", "gold", "golden", "mustard", "lemon"],
  green: ["green", "olive", "emerald", "mint", "lime", "forest", "bottle", "teal"],
  blue: ["blue", "navy", "cobalt", "sky", "azure", "indigo", "denim", "royal", "sapphire"],
  purple: ["purple", "violet", "lavender", "plum", "magenta", "lilac"],
  pink: ["pink", "fuchsia", "salmon", "blush"],
  brown: ["brown", "tan", "beige", "khaki", "chocolate", "coffee", "mocha", "camel"],
  multicolor: ["multicolor", "multi", "rainbow", "printed", "pattern", "floral", "assorted"],
};

const canonicalColor = (raw: string): string => {
  const n = normalize(raw);
  if (!n) return "unknown";
  for (const [family, synonyms] of Object.entries(COLOR_FAMILIES)) {
    for (const syn of synonyms) {
      if (n === syn || n.includes(syn)) return family;
    }
  }
  return n;
};

const colorSimilarity = (a: string, b: string): number => {
  const ca = canonicalColor(a);
  const cb = canonicalColor(b);
  if (ca === "unknown" || cb === "unknown") return 0.3; // unknown color → small partial credit
  if (ca === cb) return 1;
  return 0;
};

/* ------------------------------------------------------------------ *
 * Brand / keyword similarity — "bottle" ≈ "water bottle",
 * "laptop charger" ≈ "charger"
 * ------------------------------------------------------------------ */

// Common synonym groups used for brand + general keyword matching.
const SYNONYM_GROUPS: string[][] = [
  ["bottle", "waterbottle", "water"],
  ["charger", "adapter", "laptopcharger", "phonecharger", "power"],
  ["laptop", "notebook", "macbook"],
  ["phone", "mobile", "smartphone", "iphone", "android"],
  ["earphone", "earphones", "earbud", "earbuds", "airpod", "airpods", "headphone", "headphones"],
  ["bag", "backpack", "rucksack", "satchel", "handbag"],
  ["wallet", "purse"],
  ["key", "keys", "keychain", "keyring"],
  ["card", "id", "idcard", "identity", "aadhaar", "pan"],
  ["book", "textbook", "notebook", "novel"],
  ["umbrella", "umbrella"],
  ["watch", "smartwatch", "wristwatch"],
  ["spectacles", "glasses", "sunglasses", "eyewear"],
  ["pen", "pens", "stationery"],
];

const synonymExpansion = (tokens: string[]): Set<string> => {
  const set = new Set<string>(tokens);
  for (const group of SYNONYM_GROUPS) {
    const hit = tokens.some((t) => group.includes(t));
    if (hit) group.forEach((t) => set.add(t));
  }
  return set;
};

// Token-based overlap with synonym expansion. Returns 0..1.
const keywordSimilarity = (a: string, b: string): number => {
  const ta = normList(a);
  const tb = normList(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sa = synonymExpansion(ta);
  const sb = synonymExpansion(tb);
  // Jaccard-style overlap, but capped so exact matches get full credit.
  let overlap = 0;
  for (const t of ta) if (sb.has(t)) overlap++;
  const maxLen = Math.max(ta.length, tb.length);
  const jaccard = overlap / maxLen;
  // Also give credit for synonym-group membership even if no direct token match.
  let synonymBonus = 0;
  if (jaccard === 0) {
    for (const group of SYNONYM_GROUPS) {
      const aHits = ta.some((t) => group.includes(t));
      const bHits = tb.some((t) => group.includes(t));
      if (aHits && bHits) {
        synonymBonus = 0.6;
        break;
      }
    }
  }
  return Math.max(jaccard, synonymBonus);
};

/* ------------------------------------------------------------------ *
 * Exact / category match
 * ------------------------------------------------------------------ */

const exactSimilarity = (a: string, b: string): number => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  return 0;
};

const categorySimilarity = (a: string, b: string): number => {
  // Categories are constrained picklists, so exact match is primary.
  const base = exactSimilarity(a, b);
  if (base > 0) return base;
  // Loose fallback: keyword overlap.
  return keywordSimilarity(a, b) * 0.6;
};

/* ------------------------------------------------------------------ *
 * Date similarity — closer dates score higher.
 * ------------------------------------------------------------------ */

const dateSimilarity = (a: Date | string, b: Date | string): number => {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  const diffDays = Math.abs(da - db) / (1000 * 60 * 60 * 24);
  // Same day → 1.0; within 3 days → 0.8; within a week → 0.5; within 2 weeks → 0.25; else 0.
  if (diffDays <= 1) return 1;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.5;
  if (diffDays <= 14) return 0.25;
  return 0;
};

/* ------------------------------------------------------------------ *
 * Size similarity
 * ------------------------------------------------------------------ */

const sizeSimilarity = (a: string, b: string): number => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0.3; // unknown size → small partial credit
  if (na === nb) return 1;
  // Sizes like S/M/L/XL
  const sizeOrder = ["xs", "s", "m", "l", "xl", "xxl"];
  if (sizeOrder.includes(na) && sizeOrder.includes(nb)) {
    const diff = Math.abs(sizeOrder.indexOf(na) - sizeOrder.indexOf(nb));
    return diff <= 1 ? 0.8 : 0.3;
  }
  return keywordSimilarity(a, b);
};

/* ------------------------------------------------------------------ *
 * Core scoring
 * ------------------------------------------------------------------ */

export function scorePair(a: MatchableTicket, b: MatchableTicket): MatchResult {
  // Only LOST vs FOUND pairs are meaningful.
  // (Caller ensures this; we score regardless but it's symmetric.)
  const catSim = categorySimilarity(a.category, b.category);
  const brandSim = keywordSimilarity(a.brand, b.brand);
  const colorSim = colorSimilarity(a.color, b.color);
  const sizeSim = sizeSimilarity(a.size, b.size);
  const locSim = exactSimilarity(a.location, b.location) || keywordSimilarity(a.location, b.location) * 0.7;
  const dateSim = dateSimilarity(a.date, b.date);

  const breakdown = {
    category: catSim * MATCH_WEIGHTS.category,
    brand: brandSim * MATCH_WEIGHTS.brand,
    color: colorSim * MATCH_WEIGHTS.color,
    size: sizeSim * MATCH_WEIGHTS.size,
    location: locSim * MATCH_WEIGHTS.location,
    date: dateSim * MATCH_WEIGHTS.date,
  };

  const raw =
    breakdown.category +
    breakdown.brand +
    breakdown.color +
    breakdown.size +
    breakdown.location +
    breakdown.date;

  // Cap at 99 — never 100. Ownership always needs human verification.
  const score = Math.min(99, Math.round(raw * 10) / 10);

  let level: MatchLevel | "IGNORE" = "IGNORE";
  if (score >= 90) level = "HIGHLY_LIKELY";
  else if (score >= 75) level = "STRONG";
  else if (score >= 60) level = "POSSIBLE";

  return { ticketId: b.id, score, level, breakdown };
}

/**
 * Find all matches for a given ticket against a pool of candidates.
 * Only returns matches with level >= POSSIBLE (score >= 60).
 */
export function findMatches(
  source: MatchableTicket,
  pool: MatchableTicket[]
): MatchResult[] {
  return pool
    .map((c) => scorePair(source, c))
    .filter((m) => m.level !== "IGNORE")
    .sort((a, b) => b.score - a.score);
}
