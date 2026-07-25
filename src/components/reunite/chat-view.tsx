"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar, ScoreBadge, timeAgo } from "./shared";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { ArrowLeft, Send, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RTMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

export function ChatView({ roomId }: { roomId: string }) {
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll the server every 3s for new messages. Vercel serverless has no
  // long-running sockets, so we use TanStack Query's refetchInterval instead.
  // Messages persist via the API and sync within ~3s — perfectly usable.
  const q = useQuery({
    queryKey: ["chat", roomId],
    queryFn: () => api.chat.messages(roomId),
    refetchInterval: 3000,
  });

  const messages: RTMessage[] = q.data?.messages ?? [];

  // Auto-scroll to bottom when the message list grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = text.trim();
    if (!content || !user) return;
    setText("");
    try {
      // Persist via API (source of truth).
      await api.chat.send(roomId, content);
      // Refetch immediately so our own message appears, and refresh the room
      // list preview.
      qc.invalidateQueries({ queryKey: ["chat", roomId] });
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
    } catch (err: any) {
      toast.error(err.message || "Could not send message");
      setText(content); // restore
    }
  }

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setView({ name: "chats" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div>
        <Button variant="ghost" size="icon" onClick={() => setView({ name: "chats" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">Chat not found.</p>
      </div>
    );
  }

  const { room } = q.data;

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView({ name: "chats" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <UserAvatar name={room.otherUser.name} color={room.otherUser.avatarColor} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{room.otherUser.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {room.otherUser.department} · {room.otherUser.year}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
          Synced every 3s
        </span>
      </div>

      {/* Match context strip */}
      <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
        <ScoreBadge score={room.score} level={room.level} size="sm" />
        <span className="text-muted-foreground">
          {room.myTicket.color} {room.myTicket.brand || room.myTicket.category}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {room.otherTicket.color} {room.otherTicket.brand || room.otherTicket.category}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="reunite-scroll -mr-2 flex-1 space-y-2 overflow-y-auto pr-2 py-2"
      >
        <div className="mx-auto my-2 flex max-w-md items-start gap-2 rounded-xl bg-primary/5 p-2.5 text-[11px] text-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
          <p>You can now chat privately. Be respectful. Arrange to meet at a public spot like the Security Office or Library Reception for the handover. Final verification is done by Faculty / Security.</p>
        </div>

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showSender = !prev || prev.senderId !== m.senderId;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={cn("flex flex-col", m.isMine ? "items-end" : "items-start")}
            >
              {showSender && !m.isMine && (
                <span className="mb-0.5 ml-1 text-[10px] font-medium text-muted-foreground">{m.senderName}</span>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.isMine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
              <span className={cn("mt-0.5 px-1 text-[9px] text-muted-foreground", m.isMine ? "text-right" : "text-left")}>
                {timeAgo(m.createdAt)}
              </span>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border pt-2">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 rounded-full"
            maxLength={2000}
          />
          <Button
            size="icon"
            className="rounded-full"
            disabled={!text.trim()}
            onClick={send}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
