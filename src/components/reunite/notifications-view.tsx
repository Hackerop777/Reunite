"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, timeAgo } from "./shared";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { ArrowLeft, Bell, HeartHandshake, MessageCircle, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TYPE_ICON: Record<string, React.ReactNode> = {
  MATCH_FOUND: <HeartHandshake className="h-4 w-4 text-emerald-600" />,
  NEW_MESSAGE: <MessageCircle className="h-4 w-4 text-primary" />,
  SYSTEM: <Sparkles className="h-4 w-4 text-amber-600" />,
};

export function NotificationsView() {
  const setView = useAppStore((s) => s.setView);
  const bumpNotif = useAppStore((s) => s.bumpNotif);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications.list() });

  async function handleOpen(id: string, link: string | null, read: boolean) {
    if (!read) {
      try {
        await api.notifications.markRead(id);
        qc.invalidateQueries({ queryKey: ["notifications"] });
        bumpNotif();
      } catch {}
    }
    if (link === "/matches") setView({ name: "home" });
    else if (link === "/chats") setView({ name: "chats" });
    else setView({ name: "home" });
  }

  async function markAllRead() {
    const unread = (q.data?.notifications || []).filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => api.notifications.markRead(n.id)));
      qc.invalidateQueries({ queryKey: ["notifications"] });
      bumpNotif();
      toast.success("All caught up!");
    } catch (err: any) {
      toast.error("Could not mark all as read");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView({ name: "home" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Notifications</h1>
        {(q.data?.unreadCount || 0) > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={markAllRead}>
            <Check className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (q.data?.notifications || []).length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications yet"
          description="When the engine finds a match or someone messages you, it'll show up here."
        />
      ) : (
        <div className="space-y-2">
          {(q.data?.notifications || []).map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card
                onClick={() => handleOpen(n.id, n.link, n.read)}
                className={cn(
                  "cursor-pointer border-border p-3 transition-colors hover:bg-muted/40",
                  !n.read && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    {TYPE_ICON[n.type] || <Bell className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
