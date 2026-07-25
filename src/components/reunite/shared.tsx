"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AVATAR_COLOR_CLASSES } from "@/lib/constants";
import { levelMeta } from "@/lib/api";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  color,
  initial,
  size = "md",
  className,
}: {
  name?: string | null;
  color: string;
  initial?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const letter = initial || (name && name.length > 0 ? name.charAt(0).toUpperCase() : "?");
  const dim = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return (
    <Avatar className={cn(dim, "rounded-full", className)}>
      <AvatarFallback
        className={cn(
          "rounded-full font-semibold",
          AVATAR_COLOR_CLASSES[color] || AVATAR_COLOR_CLASSES.emerald
        )}
      >
        {letter}
      </AvatarFallback>
    </Avatar>
  );
}

export function ScoreBadge({ score, level, size = "md" }: { score: number; level: string; size?: "sm" | "md" }) {
  const meta = levelMeta(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        meta.badge,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {Math.round(score)}% · {meta.label}
    </span>
  );
}

export function LevelPill({ level }: { level: string }) {
  const meta = levelMeta(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        meta.badge
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

const CATEGORY_EMOJI: Record<string, string> = {
  Electronics: "📱",
  Bag: "🎒",
  Clothing: "👕",
  "Card / ID": "🪪",
  Keys: "🔑",
  Bottle: "🧴",
  Book: "📚",
  Wallet: "👛",
  Watch: "⌚",
  Eyewear: "👓",
  Jewelry: "💍",
  Other: "📦",
};

export function CategoryEmoji({ category, className }: { category: string; className?: string }) {
  return <span className={className}>{CATEGORY_EMOJI[category] || "📦"}</span>;
}

export function TypeBadge({ type }: { type: "LOST" | "FOUND" }) {
  return type === "LOST" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300">
      🤔 Lost
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300">
      ✨ Found
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
