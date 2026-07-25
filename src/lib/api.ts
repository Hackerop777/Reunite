"use client";

/**
 * Thin API client for Reunite. All requests are same-origin (Next.js API
 * routes). No XTransformPort needed for these — they go to the Next.js app
 * on port 3000.
 */

export interface SafeTicket {
  id: string;
  type: "LOST" | "FOUND";
  category: string;
  color: string;
  brand: string;
  size: string;
  location: string;
  date: string;
  imageUrl: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  isMine: boolean;
  reporterInitial: string;
  reporterAvatarColor: string;
}

export interface MatchItem {
  matchId: string;
  score: number;
  level: "POSSIBLE" | "STRONG" | "HIGHLY_LIKELY";
  status: string;
  createdAt: string;
  hasChat: boolean;
  chatRoomId: string | null;
  myTicket: {
    id: string;
    type: "LOST" | "FOUND";
    category: string;
    color: string;
    brand: string;
    size: string;
    location: string;
    date: string;
    imageUrl: string | null;
    description: string | null;
  };
  otherTicket: {
    id: string;
    type: "LOST" | "FOUND";
    category: string;
    color: string;
    brand: string;
    size: string;
    location: string;
    date: string;
    imageUrl: string | null;
    description: string | null;
  };
  otherUser: {
    id: string;
    name: string;
    department: string;
    year: string;
    avatarColor: string;
  };
}

export interface ChatRoomSummary {
  id: string;
  matchId: string;
  createdAt: string;
  score: number;
  level: string;
  otherUser: {
    id: string;
    name: string;
    department: string;
    year: string;
    avatarColor: string;
  };
  myTicketType: "LOST" | "FOUND";
  myTicketCategory: string;
  otherTicketCategory: string;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/**
 * Reads the simulated session id from localStorage. Used to send auth as a
 * header (works inside cross-origin iframes where SameSite cookies are not
 * attached to subrequests). Returns null on the server / before login.
 */
function sessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("lf_uid");
}

/** Merges the session header into a headers object. */
function withSession(headers: Record<string, string> = {}): Record<string, string> {
  const token = sessionToken();
  if (token) headers["x-lf-uid"] = token;
  return headers;
}

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...withSession((init?.headers as Record<string, string>) || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  auth: {
    me: () => jfetch<{ user: any }>("/api/auth"),
    createProfile: (body: {
      name: string;
      rollNumber: string;
      department: string;
      year: string;
    }) => jfetch<{ user: any }>("/api/auth", { method: "POST", body: JSON.stringify(body) }),
    logout: () => jfetch<{ ok: true }>("/api/auth", { method: "DELETE" }),
  },
  tickets: {
    list: (params: { type?: "LOST" | "FOUND" | "ALL"; mine?: boolean }) => {
      const q = new URLSearchParams();
      if (params.type) q.set("type", params.type);
      if (params.mine) q.set("mine", "true");
      return jfetch<{ tickets: SafeTicket[] }>(`/api/tickets?${q.toString()}`);
    },
    create: (body: {
      type: "LOST" | "FOUND";
      category: string;
      color: string;
      brand: string;
      size: string;
      location: string;
      date: string;
      imageUrl?: string;
      description?: string;
    }) => jfetch<{ ticket: any; newMatches: number }>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    get: (id: string) => jfetch<{ ticket: any; user: any; matches: any[] }>(`/api/tickets/${id}`),
    resolve: (id: string) => jfetch<{ ticket: any }>(`/api/tickets/${id}/resolve`, { method: "PATCH" }),
    contact: (id: string, matchId: string) =>
      jfetch<{ chatRoom: { id: string; matchId: string } }>(`/api/tickets/${id}/contact`, {
        method: "POST",
        body: JSON.stringify({ matchId }),
      }),
  },
  matches: {
    list: () => jfetch<{ matches: MatchItem[] }>("/api/matches"),
  },
  notifications: {
    list: () => jfetch<{ notifications: NotificationItem[]; unreadCount: number }>("/api/notifications"),
    markRead: (id: string) =>
      jfetch<{ notification: any }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  },
  chat: {
    rooms: () => jfetch<{ rooms: ChatRoomSummary[] }>("/api/chat/rooms"),
    messages: (roomId: string) =>
      jfetch<{ room: any; messages: any[] }>(`/api/chat/${roomId}/messages`),
    send: (roomId: string, content: string) =>
      jfetch<{ message: any }>(`/api/chat/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  },
  suggestions: {
    get: (params: { category?: string; location?: string }) => {
      const q = new URLSearchParams();
      if (params.category) q.set("category", params.category);
      if (params.location) q.set("location", params.location);
      return jfetch<{
        locations: { name: string; count: number; source: "history" | "curated" | "nearby" }[];
        hasHistory: boolean;
      }>(`/api/suggestions?${q.toString()}`);
    },
  },
};

export function levelMeta(level: string) {
  switch (level) {
    case "HIGHLY_LIKELY":
      return {
        label: "Highly likely",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-emerald-600/20",
        ring: "ring-emerald-500/40",
        dot: "bg-emerald-500",
        bar: "bg-emerald-500",
      };
    case "STRONG":
      return {
        label: "Strong match",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 ring-amber-600/20",
        ring: "ring-amber-500/40",
        dot: "bg-amber-500",
        bar: "bg-amber-500",
      };
    case "POSSIBLE":
      return {
        label: "Possible match",
        badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-slate-500/20",
        ring: "ring-slate-400/40",
        dot: "bg-slate-400",
        bar: "bg-slate-400",
      };
    default:
      return {
        label: level,
        badge: "bg-muted text-muted-foreground ring-border",
        ring: "ring-border",
        dot: "bg-muted-foreground",
        bar: "bg-muted-foreground",
      };
  }
}
