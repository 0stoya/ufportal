"use client";

import { useCallback } from "react";
import { useCartStore } from "./cartStore";

export function useCartActions() {
  const refresh = useCartStore((s) => s.refresh);
  const setSummary = useCartStore((s) => s.setSummary);

  const addToCart = useCallback(
    async (sku: string, qty = 1) => {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, qty }),
      });

      const json = await res.json();

      if (!res.ok || json?.error) {
        throw new Error(json?.error || "Failed to add to cart");
      }

      // If API returned updated totals, update instantly
      if (json?.cart?.id) setSummary({ id: json.cart.id });
      if (typeof json?.cart?.total_quantity === "number") {
        setSummary({ total_quantity: json.cart.total_quantity });
      }

      // Always confirm by refreshing summary
      await refresh();

      return json?.cart;
    },
    [refresh, setSummary]
  );

  return { addToCart, refresh };
}
