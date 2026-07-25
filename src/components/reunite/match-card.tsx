"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge, TypeBadge, UserAvatar, CategoryEmoji, fmtDate, timeAgo } from "./shared";
import type { MatchItem } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ArrowRight, MessageCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MatchCard({ match, onOpen }: { match: MatchItem; onOpen?: () => void }) {
  const setView = useAppStore((s) => s.setView);
  const isResolved = match.status === "RESOLVED";

  return (
    <Card
      className={cn(
        "overflow-hidden border-border p-0 transition-shadow hover:shadow-md",
        isResolved && "opacity-60"
      )}
    >
      {/* Score bar across the top */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <ScoreBadge score={match.score} level={match.level} size="sm" />
        <span className="text-[10px] text-muted-foreground">{timeAgo(match.createdAt)}</span>
      </div>

      <div className="p-3">
        {/* Side-by-side comparison */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          {/* My side */}
          <div className="rounded-xl bg-muted/40 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <TypeBadge type={match.myTicket.type} />
            </div>
            <div className="flex items-center gap-2">
              {match.myTicket.imageUrl ? (
                 
                <img src={match.myTicket.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-xl">
                  <CategoryEmoji category={match.myTicket.category} />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{match.myTicket.brand || match.myTicket.category}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {match.myTicket.color} · {match.myTicket.size}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{match.myTicket.location}</p>
              </div>
            </div>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center justify-center px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              VS
            </div>
          </div>

          {/* Their side */}
          <div className="rounded-xl bg-muted/40 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <TypeBadge type={match.otherTicket.type} />
            </div>
            <div className="flex items-center gap-2">
              {match.otherTicket.imageUrl ? (
                 
                <img src={match.otherTicket.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-xl">
                  <CategoryEmoji category={match.otherTicket.category} />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{match.otherTicket.brand || match.otherTicket.category}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {match.otherTicket.color} · {match.otherTicket.size}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{match.otherTicket.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Other user + actions */}
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <UserAvatar name={match.otherUser.name} color={match.otherUser.avatarColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{match.otherUser.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {match.otherUser.department} · {match.otherUser.year}
            </p>
          </div>

          {isResolved ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Resolved
            </span>
          ) : match.hasChat ? (
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => setView({ name: "chat", roomId: match.chatRoomId! })}
            >
              <MessageCircle className="mr-1 h-3.5 w-3.5" /> Open chat
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-full"
              onClick={onOpen}
            >
              Review <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
