"use client";

import { create } from "zustand";
import { fetchJson, UnauthorizedError } from "@/lib/api/fetchJson";

export type CartSummary = {
  id: string | null;
  total_quantity: number;
};

type CartState = {
  summary: CartSummary;
  isRefreshing: boolean;
  lastRefreshedAt: number;
  setSummary: (patch: Partial<CartSummary>) => void;
  refresh: () => Promise<void>;
};

type CartSummaryResponse = {
  id: string | null;
  total_quantity: number;
};

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}` || "/");
  window.location.replace(`/login?next=${next}`);
}

export const useCartStore = create<CartState>((set, get) => ({
  summary: { id: null, total_quantity: 0 },
  isRefreshing: false,
  lastRefreshedAt: 0,

  setSummary: (patch) => set((s) => ({ summary: { ...s.summary, ...patch } })),

  refresh: async () => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true });

    try {
      const json = await fetchJson<CartSummaryResponse>("/api/cart/summary");

      set({
        summary: {
          id: json.id ?? null,
          total_quantity: Number(json.total_quantity ?? 0),
        },
        lastRefreshedAt: Date.now(),
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        redirectToLogin();
      }
    } finally {
      set({ isRefreshing: false });
    }
  },
}));
