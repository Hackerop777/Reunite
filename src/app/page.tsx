"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore, type View } from "@/lib/store";
import { AppShell } from "@/components/reunite/app-shell";
import { ProfileSetup } from "@/components/reunite/profile-setup";
import { HomeView } from "@/components/reunite/home-view";
import { TicketForm } from "@/components/reunite/ticket-form";
import { TicketDetailView } from "@/components/reunite/ticket-detail-view";
import { ChatsView } from "@/components/reunite/chats-view";
import { ChatView } from "@/components/reunite/chat-view";
import { NotificationsView } from "@/components/reunite/notifications-view";
import { ProfileView } from "@/components/reunite/profile-view";
import { Loader2 } from "lucide-react";

function ViewRouter({ view }: { view: View }) {
  switch (view.name) {
    case "home":
      return <HomeView />;
    case "create":
      return <TicketForm initialType={view.ticketType} />;
    case "ticket":
      return <TicketDetailView ticketId={view.ticketId} />;
    case "chats":
      return <ChatsView />;
    case "chat":
      return <ChatView roomId={view.roomId} />;
    case "notifications":
      return <NotificationsView />;
    case "profile":
      return <ProfileView />;
    default:
      return <HomeView />;
  }
}

function AppInner() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const view = useAppStore((s) => s.view);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then(({ user }) => {
        if (!cancelled) {
          setUser(user);
          setBootLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setBootLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  if (bootLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Reunite…</p>
        </div>
      </div>
    );
  }

  if (!user) return <ProfileSetup />;

  return (
    <AppShell>
      <ViewRouter view={view} />
    </AppShell>
  );
}

export default function Home() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
