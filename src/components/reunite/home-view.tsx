"use client";

import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { api, type SafeTicket, type MatchItem } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { TicketCard } from "./ticket-card";
import { MatchCard } from "./match-card";
import { EmptyState, ScoreBadge } from "./shared";
import { motion, AnimatePresence } from "framer-motion";
import { Search, PackageOpen, HeartHandshake, Plus, Sparkles, ArrowRight } from "lucide-react";

function TicketList({ tickets, emptyTitle, emptyDesc }: { tickets: SafeTicket[]; emptyTitle: string; emptyDesc: string }) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDesc}
      />
    );
  }
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {tickets.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TicketCard
              ticket={t}
              onClick={() => useAppStore.getState().setView({ name: "ticket", ticketId: t.id })}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function HomeView() {
  const homeTab = useAppStore((s) => s.homeTab);
  const setHomeTab = useAppStore((s) => s.setHomeTab);
  const setView = useAppStore((s) => s.setView);
  const ticketsVersion = useAppStore((s) => s.ticketsVersion);

  const lostQ = useQuery({
    queryKey: ["tickets", "lost", ticketsVersion],
    queryFn: () => api.tickets.list({ type: "LOST" }),
  });
  const foundQ = useQuery({
    queryKey: ["tickets", "found", ticketsVersion],
    queryFn: () => api.tickets.list({ type: "FOUND" }),
  });
  const matchesQ = useQuery({
    queryKey: ["matches", ticketsVersion],
    queryFn: () => api.matches.list(),
  });

  const matchCount = (matchesQ.data?.matches || []).filter((m) => m.status !== "RESOLVED").length;

  return (
    <div className="space-y-4">
      {/* Hero / how-it-works strip (only on Lost tab, first load) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-emerald-600 p-4 text-primary-foreground shadow-lg shadow-primary/20"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">How Reunite works</h2>
            <p className="mt-0.5 text-xs text-primary-foreground/90">
              Post what you lost or found. Our matching engine compares structured details and notifies both sides the moment there&rsquo;s a strong match — no scrolling required.
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs value={homeTab} onValueChange={(v) => setHomeTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-full bg-muted p-1">
          <TabsTrigger value="lost" className="rounded-full data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700 dark:data-[state=active]:bg-rose-950 dark:data-[state=active]:text-rose-300">
            🤔 Lost
          </TabsTrigger>
          <TabsTrigger value="found" className="rounded-full data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-950 dark:data-[state=active]:text-emerald-300">
            ✨ Found
          </TabsTrigger>
          <TabsTrigger value="matches" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <span className="relative">
              🎯 Matches
              {matchCount > 0 && (
                <span className="absolute -right-4 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {matchCount}
                </span>
              )}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lost" className="mt-4">
          {lostQ.isLoading ? (
            <SkeletonList />
          ) : (
            <TicketList
              tickets={lostQ.data?.tickets || []}
              emptyTitle="No lost items reported yet"
              emptyDesc="Be the first to post. The moment a matching found item appears, we'll let you know."
            />
          )}
        </TabsContent>

        <TabsContent value="found" className="mt-4">
          {foundQ.isLoading ? (
            <SkeletonList />
          ) : (
            <TicketList
              tickets={foundQ.data?.tickets || []}
              emptyTitle="No found items reported yet"
              emptyDesc="Found something? Post it here so the owner can be matched automatically."
            />
          )}
        </TabsContent>

        <TabsContent value="matches" className="mt-4">
          {matchesQ.isLoading ? (
            <SkeletonList />
          ) : (matchesQ.data?.matches || []).length === 0 ? (
            <EmptyState
              icon={<HeartHandshake className="h-6 w-6" />}
              title="No matches yet"
              description="Post a lost or found item and our engine will surface strong matches here automatically — the moment they appear."
              action={
                <Button onClick={() => setView({ name: "create" })} className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" /> Post an item
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <p className="px-1 text-xs text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3" />
                {matchCount} potential {matchCount === 1 ? "match" : "matches"} found by the engine. Tap one to verify &amp; contact.
              </p>
              <AnimatePresence mode="popLayout">
                {(matchesQ.data?.matches || []).map((m: MatchItem) => (
                  <motion.div
                    key={m.matchId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <MatchCard
                      match={m}
                      onOpen={() => setView({ name: "ticket", ticketId: m.myTicket.id })}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-3">
          <div className="flex gap-3">
            <div className="h-20 w-20 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
