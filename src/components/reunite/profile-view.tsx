"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar, EmptyState, TypeBadge, fmtDate, timeAgo } from "./shared";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { ArrowLeft, LogOut, PackageOpen, Sparkles, Compass } from "lucide-react";
import { motion } from "framer-motion";

export function ProfileView() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setView = useAppStore((s) => s.setView);
  const setHomeTab = useAppStore((s) => s.setHomeTab);
  const ticketsVersion = useAppStore((s) => s.ticketsVersion);

  const myQ = useQuery({
    queryKey: ["tickets", "mine", ticketsVersion],
    queryFn: () => api.tickets.list({ type: "ALL", mine: true }),
  });

  async function handleLogout() {
    try {
      await api.auth.logout();
      setUser(null);
      toast.success("Logged out");
    } catch (err: any) {
      toast.error(err.message || "Logout failed");
    }
  }

  if (!user) return null;

  const lostCount = (myQ.data?.tickets || []).filter((t) => t.type === "LOST").length;
  const foundCount = (myQ.data?.tickets || []).filter((t) => t.type === "FOUND").length;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView({ name: "home" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">My profile</h1>
        <Button variant="ghost" size="sm" className="ml-auto text-xs text-muted-foreground" onClick={handleLogout}>
          <LogOut className="mr-1 h-3.5 w-3.5" /> Logout
        </Button>
      </div>

      {/* Profile header */}
      <Card className="overflow-hidden p-0">
        <div className="h-20 bg-gradient-to-br from-primary to-emerald-600" />
        <div className="px-4 pb-4">
          <div className="-mt-8 mb-2 flex justify-center">
            <div className="rounded-full bg-background p-1">
              <UserAvatar name={user.name} color={user.avatarColor} size="lg" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">{user.name}</h2>
            <p className="text-xs text-muted-foreground">{user.rollNumber}</p>
            <p className="text-xs text-muted-foreground">{user.department} · {user.year}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-2xl font-bold text-rose-600">{lostCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lost posted</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{foundCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Found posted</p>
            </div>
          </div>
        </div>
      </Card>

      {/* My tickets */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-bold">My items</h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView({ name: "create" })}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Post new
          </Button>
        </div>

        {myQ.isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (myQ.data?.tickets || []).length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-6 w-6" />}
            title="No items posted yet"
            description="Post your first lost or found item to get matched."
            action={
              <Button className="rounded-full" onClick={() => setView({ name: "create" })}>
                Post an item
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {(myQ.data?.tickets || []).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className="cursor-pointer border-border p-3 transition-colors hover:bg-muted/40"
                  onClick={() => setView({ name: "ticket", ticketId: t.id })}
                >
                  <div className="flex items-center gap-3">
                    {t.imageUrl ? (
                       
                      <img src={t.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                        {t.type === "LOST" ? "🤔" : "✨"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <TypeBadge type={t.type} />
                        {t.status === "RESOLVED" && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            RESOLVED
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold">{t.brand || t.category}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {t.color} · {t.location} · {fmtDate(t.date)}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(t.createdAt)}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        <Compass className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p>
          <strong>About Reunite:</strong> A smart campus lost &amp; found. Instead of scrolling through dozens of posts, our weighted matching engine compares structured details (category, brand, color, size, location, date) and tells both sides the moment there&rsquo;s a strong match.
        </p>
      </div>
    </div>
  );
}
