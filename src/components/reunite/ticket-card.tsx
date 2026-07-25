"use client";

import { Card } from "@/components/ui/card";
import { CategoryEmoji, TypeBadge, UserAvatar, fmtDate, timeAgo } from "./shared";
import type { SafeTicket } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

export function TicketCard({ ticket, onClick }: { ticket: SafeTicket; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer overflow-hidden border-border p-0 transition-all hover:border-primary/40 hover:shadow-md",
        "active:scale-[0.99]"
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Image / emoji thumbnail */}
        {ticket.imageUrl ? (
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
            { }
            <img
              src={ticket.imageUrl}
              alt={ticket.category}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">
            <CategoryEmoji category={ticket.category} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TypeBadge type={ticket.type} />
            {ticket.isMine && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                Mine
              </span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(ticket.createdAt)}</span>
          </div>

          <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
            {ticket.brand || ticket.category}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {ticket.color} · {ticket.size} · {ticket.category}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{ticket.location}</span>
            <span className="mx-1">·</span>
            <span className="flex-shrink-0">{fmtDate(ticket.date)}</span>
          </div>
        </div>
      </div>

      {ticket.description && (
        <p className="border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground line-clamp-1">
          {ticket.description}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border bg-card/50 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <UserAvatar name="" color={ticket.reporterAvatarColor} initial={ticket.reporterInitial} size="sm" />
          <span className="text-[11px] text-muted-foreground">Anonymous reporter</span>
        </div>
        <span className="text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View →
        </span>
      </div>
    </Card>
  );
}
