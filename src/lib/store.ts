"use client";

import { create } from "zustand";

export type View =
  | { name: "home" }
  | { name: "create"; ticketType?: "LOST" | "FOUND" }
  | { name: "ticket"; ticketId: string }
  | { name: "matches" }
  | { name: "chats" }
  | { name: "chat"; roomId: string }
  | { name: "notifications" }
  | { name: "profile" };

export type HomeTab = "lost" | "found" | "matches";

export interface UserProfile {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: string;
  avatarColor: string;
  createdAt: string;
}

interface AppState {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;

  view: View;
  setView: (v: View) => void;

  homeTab: HomeTab;
  setHomeTab: (t: HomeTab) => void;

  // A counter that bumps when notifications are read, so the bell can react.
  notifVersion: number;
  bumpNotif: () => void;

  // Refresh trigger for tickets list (bump after creating a ticket)
  ticketsVersion: number;
  bumpTickets: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  // Persist the session id to localStorage so it can be sent as a header on
  // every API request. This is what keeps simulated auth working inside a
  // cross-origin iframe (preview panel), where SameSite cookies are not
  // attached to subrequests.
  setUser: (u) => {
    if (typeof window !== "undefined") {
      if (u) window.localStorage.setItem("lf_uid", u.id);
      else window.localStorage.removeItem("lf_uid");
    }
    set({ user: u });
  },

  view: { name: "home" },
  setView: (v) => set({ view: v }),

  homeTab: "lost",
  setHomeTab: (t) => set({ homeTab: t }),

  notifVersion: 0,
  bumpNotif: () => set((s) => ({ notifVersion: s.notifVersion + 1 })),

  ticketsVersion: 0,
  bumpTickets: () => set((s) => ({ ticketsVersion: s.ticketsVersion + 1 })),
}));
