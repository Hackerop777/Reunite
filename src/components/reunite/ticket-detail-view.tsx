"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoryEmoji,
  EmptyState,
  ScoreBadge,
  TypeBadge,
  UserAvatar,
  fmtDate,
  timeAgo,
} from "./shared";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  MapPin,
  Calendar,
  Tag,
  Palette,
  Ruler,
  ShieldCheck,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

export function TicketDetailView({ ticketId }: { ticketId: string }) {
  const setView = useAppStore((s) => s.setView);
  const bumpTickets = useAppStore((s) => s.bumpTickets);
  const setHomeTab = useAppStore((s) => s.setHomeTab);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => api.tickets.get(ticketId),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setView({ name: "home" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div>
        <Button variant="ghost" size="icon" onClick={() => setView({ name: "home" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <EmptyState icon={<Info className="h-6 w-6" />} title="Ticket not found" description="This item may have been removed." />
      </div>
    );
  }

  const { ticket, user, matches } = q.data;
  const isResolved = ticket.status === "RESOLVED";

  async function handleContact(matchId: string) {
    try {
      const { chatRoom } = await api.tickets.contact(ticketId, matchId);
      toast.success("Chat opened. Say hi — your identity is now shared with this person.");
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
      setView({ name: "chat", roomId: chatRoom.id });
    } catch (err: any) {
      toast.error(err.message || "Could not open chat");
    }
  }

  async function handleResolve() {
    try {
      await api.tickets.resolve(ticketId);
      bumpTickets();
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      toast.success("Marked as resolved. Great job reuniting an item!");
      setHomeTab("matches");
      setView({ name: "home" });
    } catch (err: any) {
      toast.error(err.message || "Could not resolve");
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView({ name: "home" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Item details</h1>
        {isResolved && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
          </span>
        )}
      </div>

      {/* Main ticket card */}
      <Card className="overflow-hidden p-0">
        {ticket.imageUrl ? (
           
          <img src={ticket.imageUrl} alt={ticket.category} className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-32 items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-6xl">
            <CategoryEmoji category={ticket.category} />
          </div>
        )}

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <TypeBadge type={ticket.type} />
            <span className="text-xs text-muted-foreground">posted {timeAgo(ticket.createdAt)}</span>
          </div>

          <h2 className="text-xl font-bold">{ticket.brand || ticket.category}</h2>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Detail icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={ticket.category} />
            <Detail icon={<Palette className="h-3.5 w-3.5" />} label="Color" value={ticket.color} />
            <Detail icon={<Ruler className="h-3.5 w-3.5" />} label="Size" value={ticket.size} />
            <Detail icon={<MapPin className="h-3.5 w-3.5" />} label={ticket.type === "LOST" ? "Lost at" : "Found at"} value={ticket.location} />
            <Detail icon={<Calendar className="h-3.5 w-3.5" />} label={ticket.type === "LOST" ? "Lost on" : "Found on"} value={fmtDate(ticket.date)} />
          </div>

          {ticket.description && (
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          {/* Reporter row */}
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <UserAvatar
              name={user.name || undefined}
              color={user.avatarColor}
              initial={user.initial}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">
                {ticket.isMine ? "You" : user.name || "Anonymous reporter"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {ticket.isMine
                  ? `${user.department} · ${user.rollNumber}`
                  : `${user.department}${user.year ? ` · ${user.year}` : ""}`}
              </p>
            </div>
          </div>

          {ticket.isMine && !isResolved && (
            <Button variant="outline" className="w-full rounded-full" onClick={handleResolve}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as resolved
            </Button>
          )}
        </div>
      </Card>

      {/* Matches section — the heart of the product */}
      <div>
        <div className="mb-2 flex items-center gap-2 px-1">
          <h3 className="text-sm font-bold">
            {ticket.isMine ? "Potential matches" : "Matches for this item"}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {matches.length}
          </span>
        </div>

        {matches.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="No matches yet"
            description="The matching engine will surface strong candidates here automatically, the moment they're posted."
          />
        ) : (
          <div className="space-y-3">
            {matches.map((m: any) => {
              const oppositeIsMine = ticket.isMine === false && m.oppositeUser.id === useAppStore.getState().user?.id;
              return (
                <motion.div
                  key={m.matchId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden border-border p-0">
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
                      <ScoreBadge score={m.score} level={m.level} size="sm" />
                      <span className="text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        {m.oppositeTicket.imageUrl ? (
                           
                          <img src={m.oppositeTicket.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-2xl">
                            <CategoryEmoji category={m.oppositeTicket.category} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <TypeBadge type={m.oppositeTicket.type} />
                          </div>
                          <p className="mt-0.5 truncate text-sm font-semibold">
                            {m.oppositeTicket.brand || m.oppositeTicket.category}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.oppositeTicket.color} · {m.oppositeTicket.size} · {m.oppositeTicket.location}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {fmtDate(m.oppositeTicket.date)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                        <UserAvatar
                          name={m.oppositeUser.name || undefined}
                          color={m.oppositeUser.avatarColor}
                          initial={m.oppositeUser.initial}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {oppositeIsMine || ticket.isMine ? m.oppositeUser.name || "Anonymous" : "Anonymous reporter"}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {m.oppositeUser.department}
                          </p>
                        </div>

                        {ticket.isMine && m.status !== "RESOLVED" && (
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={() => handleContact(m.matchId)}
                          >
                            <MessageCircle className="mr-1 h-3.5 w-3.5" />
                            {m.status === "CONTACTED" ? "Open chat" : "Contact"}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        )}
                        {m.status === "RESOLVED" && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verification note */}
      <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs text-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p>
          <strong>Verification:</strong> Reunite only introduces both parties. Final ownership is verified by Faculty, the Security Office, or the Lost &amp; Found desk — never by students themselves.
        </p>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
