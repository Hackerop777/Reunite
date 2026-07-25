/**
 * Shared constants for Reunite — categories, locations, colors.
 * Used by both the ticket form and the matching engine consumers.
 */

export const CATEGORIES = [
  "Electronics",
  "Bag",
  "Clothing",
  "Card / ID",
  "Keys",
  "Bottle",
  "Book",
  "Wallet",
  "Watch",
  "Eyewear",
  "Jewelry",
  "Other",
] as const;

export const LOCATIONS = [
  "Library",
  "Library Reception",
  "Canteen",
  "Canteen Counter",
  "Ground",
  "Sports Complex",
  "Lab",
  "Computer Lab",
  "Lecture Hall",
  "Auditorium",
  "Hostel",
  "Parking Lot",
  "Security Office",
  "Reception",
  "Classroom",
  "Washroom",
  "Corridor",
  "Bus Stop",
  "Gym",
  "Other",
] as const;

export const COLORS = [
  "Black",
  "White",
  "Gray",
  "Red",
  "Blue",
  "Navy",
  "Green",
  "Dark Green",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Brown",
  "Beige",
  "Silver",
  "Gold",
  "Multicolor",
] as const;

export const SIZES = ["S", "M", "L", "XL", "XXL", "Small", "Medium", "Large", "Standard", "One Size"] as const;

export const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
  "Chemical",
  "Biotechnology",
  "Architecture",
  "Business Administration",
  "Arts & Humanities",
  "Science",
  "Other",
] as const;

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgrad"] as const;

export const AVATAR_COLORS = [
  "emerald",
  "teal",
  "amber",
  "rose",
  "violet",
  "cyan",
  "orange",
  "fuchsia",
] as const;

/** 30-day expiry from now, used for new tickets. */
export const TICKET_TTL_DAYS = 30;
export function expiryFromNow(): Date {
  return new Date(Date.now() + TICKET_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Map avatar color name → tailwind classes for a colored avatar chip. */
export const AVATAR_COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
};
