"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar, EmptyState, timeAgo, TypeBadge } from "./shared";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ArrowLeft, MessageCircle, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export function ChatsView() {
  const setView = useAppStore((s) => s.setView);
  const q = useQuery({ queryKey: ["chat-rooms"], queryFn: () => api.chat.rooms() });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView({ name: "home" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Chats</h1>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        Private conversations open only after a match is found. No phone numbers, no Instagram, no WhatsApp — everything stays inside Reunite.
      </p>

      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : (q.data?.rooms || []).length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title="No chats yet"
          description="When you open a chat on a match, the conversation will appear here."
          action={
            <Button className="rounded-full" onClick={() => setView({ name: "home" })}>
              Browse matches
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {(q.data?.rooms || []).map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className="cursor-pointer border-border p-3 transition-colors hover:bg-muted/40"
                onClick={() => setView({ name: "chat", roomId: room.id })}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <UserAvatar name={room.otherUser.name} color={room.otherUser.avatarColor} size="md" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-[8px]">
                      {room.myTicketType === "LOST" ? "🤔" : "✨"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{room.otherUser.name}</p>
                      {room.lastMessage && (
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(room.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      <TypeBadge type={room.myTicketType} /> {room.myTicketCategory} ↔ {room.otherTicketCategory}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {room.lastMessage
                        ? `${room.lastMessage.senderId === useAppStore.getState().user?.id ? "You: " : ""}${room.lastMessage.content}`
                        : "Say hi 👋"}
                    </p>
                  </div>
                  <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
