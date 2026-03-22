"use client";

import { create } from "zustand";

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

export const useCartStore = create<CartState>((set, get) => ({
  summary: { id: null, total_quantity: 0 },
  isRefreshing: false,
  lastRefreshedAt: 0,

  setSummary: (patch) =>
    set((s) => ({ summary: { ...s.summary, ...patch } })),

  refresh: async () => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true });

    try {
      const res = await fetch("/api/cart/summary", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || json?.error) return;

      set({
        summary: {
          id: json.id ?? null,
          total_quantity: Number(json.total_quantity ?? 0),
        },
        lastRefreshedAt: Date.now(),
      });
    } finally {
      set({ isRefreshing: false });
    }
  },
}));
