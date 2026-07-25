"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Compass, Home, MessageCircle, Plus, User, Bell, HeartHandshake } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setHomeTab = useAppStore((s) => s.setHomeTab);
  const notifVersion = useAppStore((s) => s.notifVersion);

  const notifQ = useQuery({
    queryKey: ["notifications-unread", notifVersion],
    queryFn: () => api.notifications.list(),
    refetchInterval: 30000,
  });
  const unread = notifQ.data?.unreadCount || 0;

  const chatQ = useQuery({
    queryKey: ["chat-rooms-badge"],
    queryFn: () => api.chat.rooms(),
    refetchInterval: 30000,
  });
  const chatCount = (chatQ.data?.rooms || []).length;

  const isHome = view.name === "home";

  // Hide the bottom nav inside the chat view (full-height chat experience).
  const hideBottomNav = view.name === "chat";

  const navItems: {
    key: string;
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
    badge?: number;
  }[] = [
    {
      key: "home",
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      active: isHome,
      onClick: () => setView({ name: "home" }),
    },
    {
      key: "matches",
      label: "Matches",
      icon: <HeartHandshake className="h-5 w-5" />,
      active: false,
      onClick: () => {
        setHomeTab("matches");
        setView({ name: "home" });
      },
    },
    {
      key: "create",
      label: "Post",
      icon: <Plus className="h-6 w-6" />,
      active: view.name === "create",
      onClick: () => setView({ name: "create" }),
    },
    {
      key: "chats",
      label: "Chats",
      icon: <MessageCircle className="h-5 w-5" />,
      active: view.name === "chats",
      onClick: () => setView({ name: "chats" }),
      badge: chatCount,
    },
    {
      key: "profile",
      label: "Profile",
      icon: <User className="h-5 w-5" />,
      active: view.name === "profile",
      onClick: () => setView({ name: "profile" }),
    },
  ];

  // On mount, ensure we don't keep stale scroll position when switching views.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4">
          <button
            onClick={() => setView({ name: "home" })}
            className="flex items-center gap-2"
            aria-label="Reunite home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Compass className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Reunite</span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setView({ name: "notifications" })}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={cn(
          "mx-auto w-full max-w-2xl flex-1 px-4 pt-4",
          hideBottomNav ? "pb-4" : "pb-28 md:pb-10"
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={JSON.stringify(view)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav (mobile) / floating nav (desktop) */}
      {!hideBottomNav && (
        <nav className="pb-safe fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/90 backdrop-blur-md md:bottom-4 md:left-1/2 md:right-auto md:w-[min(28rem,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-full md:border md:shadow-xl">
          <div className="mx-auto flex h-16 max-w-2xl items-stretch justify-around px-2 md:h-14 md:gap-1">
            {navItems.map((item) => {
              const isCenter = item.key === "create";
              if (isCenter) {
                return (
                  <button
                    key={item.key}
                    onClick={item.onClick}
                    className="relative -mt-4 flex flex-col items-center justify-end pb-1"
                    aria-label={item.label}
                  >
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
                        item.active
                          ? "bg-primary text-primary-foreground shadow-primary/40"
                          : "bg-primary text-primary-foreground shadow-primary/30"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className={cn("mt-0.5 text-[10px] font-medium", item.active ? "text-primary" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-muted/50"
                  aria-label={item.label}
                >
                  <span className={cn(item.active ? "text-primary" : "text-muted-foreground")}>
                    {item.icon}
                  </span>
                  <span className={cn("text-[10px] font-medium", item.active ? "text-primary" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="absolute right-[22%] top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
