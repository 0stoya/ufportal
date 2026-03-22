"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PORTAL_EVENTS } from "@/lib/portal/events";

type PortalState = {
  cartCount: number;
  listsCount: number;
  loading: boolean;
  refreshAll: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshLists: () => Promise<void>;
  cartIsEmpty: boolean;
  listsAreEmpty: boolean;
};

const Ctx = createContext<PortalState | null>(null);

async function safeGetCount(url: string): Promise<number> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  // If endpoint is returning HTML (redirect/login), you’ll see it here.
  const text = await res.text();

  if (!res.ok) {
    // Log once; provider should not crash UI.
    console.error(`[PortalState] ${url} failed:`, res.status, text.slice(0, 200));
    return 0;
  }

  try {
    const json = JSON.parse(text) as { count?: unknown };
    const n = Number(json?.count ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    console.error(`[PortalState] ${url} returned non-JSON:`, text.slice(0, 200));
    return 0;
  }
}

export function PortalStateProvider({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [listsCount, setListsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    const n = await safeGetCount("/api/portal/cart/count");
    setCartCount(n);
  }, []);

  const refreshLists = useCallback(async () => {
    const n = await safeGetCount("/api/portal/lists/count");
    setListsCount(n);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([refreshCart(), refreshLists()]);
    } finally {
      setLoading(false);
    }
  }, [refreshCart, refreshLists]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // Cart event-driven refresh (badge updates instantly)
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void refreshCart();
      }, 150);
    };

    window.addEventListener(PORTAL_EVENTS.cartChanged, handler);
    return () => window.removeEventListener(PORTAL_EVENTS.cartChanged, handler);
  }, [refreshCart]);

  const value = useMemo<PortalState>(
    () => ({
      cartCount,
      listsCount,
      loading,
      refreshAll,
      refreshCart,
      refreshLists,
      cartIsEmpty: cartCount <= 0,
      listsAreEmpty: listsCount <= 0,
    }),
    [cartCount, listsCount, loading, refreshAll, refreshCart, refreshLists]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortalState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortalState must be used within PortalStateProvider");
  return v;
}
