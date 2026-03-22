"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Cart, CartItem, Money, CustomAttribute } from "@/lib/magento/types";
import { formatMoney } from "@/lib/utils";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  Loader2,
  PackageOpen,
  ChevronLeft,
  Hash,
  Package,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useCartStore } from "@/lib/cart/cartStore";

/**
 * Cart Page (Production)
 * - Displays unit price using product.resolved_price (custom first, fallback to standard)
 * - Displays totals from Magento cart.prices (source of truth)
 * - Mutations return full cart shape, so UI doesn't lose prices/images after updates
 * - After every mutation, refreshes nav/cart badge via useCartStore().refresh()
 */

// --- API helper ---
type ApiError = { error?: string };

async function requestJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; message: string; status?: number }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
      const msg = json?.error || `Request failed (${res.status})`;
      return { ok: false, message: String(msg), status: res.status };
    }

    if (json && typeof json === "object" && "error" in json && json.error) {
      return { ok: false, message: String(json.error), status: res.status };
    }

    return { ok: true, data: json as T };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : "Network error" };
  }
}

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function getAttr(attrs: CustomAttribute[] | null | undefined, code: string) {
  if (!attrs?.length) return null;
  const found = attrs.find((a) => a.attribute_metadata?.code === code);
  const v = found?.entered_attribute_value?.value;
  return v == null || String(v).trim() === "" ? null : String(v);
}

function clampQty(n: number) {
  const q = Math.floor(Number(n));
  if (!Number.isFinite(q)) return 1;
  return Math.max(1, q);
}

function moneyOrNull(m?: Money | null) {
  return m && typeof m.value === "number" && m.currency ? m : null;
}

// --- resolved price helpers (custom first) ---
function getResolvedUnitPrice(item: CartItem): Money | null {
  const rp = item.product?.resolved_price;
  const chosen = rp?.custom ?? rp?.standard;
  if (!chosen) return null;

  const value = Number(chosen.value_incl_tax);
  const currency = chosen.currency;

  if (!Number.isFinite(value) || !currency) return null;
  return { value, currency };
}

function getResolvedRowTotal(item: CartItem): Money | null {
  const unit = getResolvedUnitPrice(item);
  if (!unit) return null;

  const value = unit.value * Number(item.quantity || 0);
  if (!Number.isFinite(value)) return null;

  return { value, currency: unit.currency };
}

type CartOk = { ok: true; cart: Cart };

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={cx("text-sm", strong ? "font-bold text-slate-900" : "text-slate-600")}>
        {label}
      </span>
      <span className={cx("text-sm tabular-nums", strong ? "font-bold text-slate-900" : "font-medium text-slate-900")}>
        {value}
      </span>
    </div>
  );
}

function QtyStepper({
  value,
  onDec,
  onInc,
  disabled,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center border border-slate-200 rounded-lg bg-white shadow-sm">
      <button
        onClick={onDec}
        disabled={disabled || value <= 1}
        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        aria-label="Decrease quantity"
        type="button"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <div className="w-10 text-center text-sm font-semibold text-slate-900 tabular-nums">{value}</div>

      <button
        onClick={onInc}
        disabled={disabled}
        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        aria-label="Increase quantity"
        type="button"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CartItemCard({
  item,
  busy,
  units,
  unitPrice,
  rowShown,
  onDec,
  onInc,
  onRemove,
}: {
  item: CartItem;
  busy: boolean;
  units: string | null;
  unitPrice: Money | null;
  rowShown: Money | null;
  onDec: () => void;
  onInc: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition",
        busy && "opacity-60"
      )}
    >
      <div className="flex gap-3">
        <div className="h-16 w-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
          {item.product.small_image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.product.small_image.url}
              alt={item.product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-300">
              <PackageOpen className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/product/${encodeURIComponent(item.product.sku)}`}
            className="font-semibold text-slate-900 hover:text-primary line-clamp-2"
          >
            {item.product.name}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-mono">{item.product.sku}</span>
            </span>

            {units ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                <Package className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{units}</span>
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="text-xs text-slate-500">
              <div>
                Unit price:{" "}
                <span className="font-semibold text-slate-900">
                  {unitPrice ? formatMoney(unitPrice.value, unitPrice.currency) : "—"}
                </span>
              </div>
              <div className="mt-1">
                Row total:{" "}
                <span className="font-black text-slate-900 text-base">
                  {rowShown ? formatMoney(rowShown.value, rowShown.currency) : "—"}
                </span>
              </div>
            </div>

            <button
              onClick={onRemove}
              disabled={busy}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Remove item"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</span>
            <QtyStepper value={item.quantity} onDec={onDec} onInc={onInc} disabled={busy} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { show } = useToast();

  const refreshNavCart = useCartStore((s) => s.refresh);
  const setNavSummary = useCartStore((s) => s.setSummary);

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // prevents out-of-order response overwrites
  const reqSeq = useRef(0);

  const isEmpty = (cart?.items?.length ?? 0) === 0;

  const totals = useMemo(() => {
    const p: any = cart?.prices;

    const subtotalEx = moneyOrNull(p?.subtotal_excluding_tax);
    const subtotalInc = moneyOrNull(p?.subtotal_including_tax);
    const grand = moneyOrNull(p?.grand_total);

    const vat =
      subtotalEx && subtotalInc && subtotalEx.currency === subtotalInc.currency
        ? { value: subtotalInc.value - subtotalEx.value, currency: subtotalInc.currency }
        : null;

    return {
      subtotalEx,
      vat,
      grand,
      taxes: Array.isArray(p?.applied_taxes) ? p.applied_taxes : [],
      discounts: Array.isArray(p?.discounts) ? p.discounts : [],
    };
  }, [cart]);

  const syncNavBadgeFromCart = useCallback(
    async (nextCart: Cart | null) => {
      if (nextCart?.id) setNavSummary({ id: nextCart.id });
      if (typeof nextCart?.total_quantity === "number") setNavSummary({ total_quantity: nextCart.total_quantity });
      await refreshNavCart();
    },
    [refreshNavCart, setNavSummary]
  );

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    const mySeq = ++reqSeq.current;

    const result = await requestJson<Cart>("/api/cart", { method: "GET" });
    if (mySeq !== reqSeq.current) return;

    if (!result.ok) {
      setCart(null);
      setError(result.message || "Failed to load cart");
      setLoading(false);
      await syncNavBadgeFromCart(null);
      return;
    }

    setCart(result.data);
    setLoading(false);
    await syncNavBadgeFromCart(result.data);
  }, [syncNavBadgeFromCart]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const updateQty = useCallback(
    async (item: CartItem, nextQty: number) => {
      const itemId = Number(item.id);
      const qty = clampQty(nextQty);
      if (!Number.isFinite(itemId)) return;

      setBusyId(itemId);
      setError(null);

      // Optimistic UI
      setCart((prev) => {
        if (!prev?.items) return prev;
        return {
          ...prev,
          items: prev.items.map((it) => (Number(it.id) === itemId ? { ...it, quantity: qty } : it)),
        };
      });

      const mySeq = ++reqSeq.current;
      const result = await requestJson<CartOk>("/api/cart/update", {
        method: "POST",
        body: JSON.stringify({ cart_item_id: itemId, quantity: qty }),
      });

      if (mySeq !== reqSeq.current) return;

      if (!result.ok) {
        setError(result.message || "Failed to update cart");
        show({ type: "error", title: "Update failed", message: result.message });
        setBusyId(null);
        void loadCart(); // resync
        return;
      }

      setCart(result.data.cart);
      setBusyId(null);

      show({ type: "success", title: "Cart updated", message: "Quantity updated." });
      await syncNavBadgeFromCart(result.data.cart);
    },
    [loadCart, show, syncNavBadgeFromCart]
  );

  const removeItem = useCallback(
    async (item: CartItem) => {
      const itemId = Number(item.id);
      if (!Number.isFinite(itemId)) return;

      setBusyId(itemId);
      setError(null);

      // Optimistic remove
      setCart((prev) => {
        if (!prev?.items) return prev;
        return { ...prev, items: prev.items.filter((it) => Number(it.id) !== itemId) };
      });

      const mySeq = ++reqSeq.current;
      const result = await requestJson<CartOk>("/api/cart/remove", {
        method: "POST",
        body: JSON.stringify({ cart_item_id: itemId }),
      });

      if (mySeq !== reqSeq.current) return;

      if (!result.ok) {
        setError(result.message || "Failed to remove item");
        show({ type: "error", title: "Remove failed", message: result.message });
        setBusyId(null);
        void loadCart();
        return;
      }

      setCart(result.data.cart);
      setBusyId(null);

      show({ type: "success", title: "Removed", message: "Item removed from cart." });
      await syncNavBadgeFromCart(result.data.cart);
    },
    [loadCart, show, syncNavBadgeFromCart]
  );

  const checkoutHref = "/checkout";

  // Sticky mobile checkout bar height ~84px + safe-area
  const pageBottomPad =
    "pb-[calc(120px+env(safe-area-inset-bottom))] sm:pb-8"; // accounts for sticky checkout bar + your bottom nav

  if (loading && !cart) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
        <p>Loading your cart...</p>
      </div>
    );
  }

  return (
    <>
      <main className={cx("w-full max-w-full px-4 sm:px-6 lg:px-8 pt-6", pageBottomPad)}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Link href="/orders" className="sm:hidden p-2 -ml-2 text-slate-400 hover:text-slate-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">Cart</h1>
          </div>

          <Link
            href="/search"
            className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-primary hover:underline"
          >
            Continue shopping
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
            {error}
          </div>
        )}

        {/* Empty */}
        {isEmpty ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
              <ShoppingBag className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Your cart is empty</h2>
            <p className="text-slate-500 mt-1 mb-6 max-w-xs mx-auto">
              Looks like you haven&apos;t added anything to your cart yet.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-xl shadow-sm hover:bg-primary/90 transition"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-4">
              {/* Mobile cards */}
              <div className="sm:hidden space-y-4">
                {cart?.items.map((item) => {
                  const isBusy = busyId === Number(item.id);
                  const units = getAttr(item.product?.custom_attributes, "units");

                  const unitResolved = getResolvedUnitPrice(item);
                  const rowTotalResolved = getResolvedRowTotal(item);
                  const rowFallback =
                    item.prices?.row_total_including_tax ?? item.prices?.row_total ?? null;
                  const rowShown = rowTotalResolved ?? rowFallback;

                  return (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      busy={isBusy}
                      units={units}
                      unitPrice={unitResolved}
                      rowShown={rowShown}
                      onDec={() => updateQty(item, item.quantity - 1)}
                      onInc={() => updateQty(item, item.quantity + 1)}
                      onRemove={() => removeItem(item)}
                    />
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-right">Unit price</div>
                  <div className="col-span-3 text-center">Qty</div>
                  <div className="col-span-1 text-right" />
                </div>

                <div className="divide-y divide-slate-100">
                  {cart?.items.map((item) => {
                    const isBusy = busyId === Number(item.id);
                    const units = getAttr(item.product?.custom_attributes, "units");

                    const unitResolved = getResolvedUnitPrice(item);
                    const rowTotalResolved = getResolvedRowTotal(item);
                    const rowFallback =
                      item.prices?.row_total_including_tax ?? item.prices?.row_total ?? null;
                    const rowShown = rowTotalResolved ?? rowFallback;

                    return (
                      <div
                        key={item.id}
                        className={cx(
                          "group grid grid-cols-12 gap-4 p-4 items-center transition-opacity",
                          isBusy && "opacity-60"
                        )}
                      >
                        {/* Product */}
                        <div className="col-span-6 flex gap-4">
                          <div className="h-16 w-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                            {item.product.small_image?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.product.small_image.url}
                                alt={item.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-300">
                                <PackageOpen className="h-6 w-6" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <Link
                              href={`/product/${encodeURIComponent(item.product.sku)}`}
                              className="font-semibold text-slate-900 hover:text-primary line-clamp-2"
                            >
                              {item.product.name}
                            </Link>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono">{item.product.sku}</span>
                              </span>

                              {units ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                  <Package className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="font-semibold text-slate-800">{units}</span>
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 text-xs text-slate-500">
                              Row total:{" "}
                              <span className="font-bold text-slate-900">
                                {rowShown ? formatMoney(rowShown.value, rowShown.currency) : "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Unit price */}
                        <div className="col-span-2 text-right">
                          <div className="text-slate-900 font-semibold text-sm">
                            {unitResolved ? formatMoney(unitResolved.value, unitResolved.currency) : "—"}
                          </div>
                        </div>

                        {/* Qty */}
                        <div className="col-span-3 flex justify-center">
                          <QtyStepper
                            value={item.quantity}
                            disabled={isBusy}
                            onDec={() => updateQty(item, item.quantity - 1)}
                            onInc={() => updateQty(item, item.quantity + 1)}
                          />
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => removeItem(item)}
                            disabled={isBusy}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove item"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Desktop summary */}
            <div className="hidden lg:block lg:col-span-1 sticky top-6 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-black text-slate-900 mb-4">Summary</h2>

                <div className="space-y-3 pb-5 border-b border-slate-100">
                  <SummaryRow
                    label="Subtotal (ex VAT)"
                    value={totals.subtotalEx ? formatMoney(totals.subtotalEx.value, totals.subtotalEx.currency) : "—"}
                  />
                  <SummaryRow
                    label="VAT"
                    value={totals.vat ? formatMoney(totals.vat.value, totals.vat.currency) : "—"}
                  />
                </div>

                <div className="pt-4">
                  <SummaryRow
                    label="Total (inc VAT)"
                    value={totals.grand ? formatMoney(totals.grand.value, totals.grand.currency) : "—"}
                    strong
                  />
                </div>

                <Link
                  href={checkoutHref}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-black text-white bg-primary rounded-xl shadow-sm hover:bg-primary/90 hover:shadow-md transition active:scale-[0.98]"
                >
                  Proceed to checkout
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => void loadCart()}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                    type="button"
                  >
                    Refresh cart
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  Prices and availability are subject to change. <br />
                  VAT is calculated from cart totals.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile sticky checkout bar */}
      {!isEmpty ? (
<div
  className="
    lg:hidden fixed inset-x-0 z-50
    bottom-[80px]
    border-t border-border bg-background/95 backdrop-blur
    pb-[env(safe-area-inset-bottom)]
  "
  role="region"
  aria-label="Cart totals"
>
          <div className="mx-auto max-w-md px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Total (inc VAT)
                </div>
                <div className="text-lg font-black text-slate-900 tabular-nums">
                  {totals.grand ? formatMoney(totals.grand.value, totals.grand.currency) : "—"}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Subtotal ex VAT:{" "}
                  <span className="font-semibold text-slate-700">
                    {totals.subtotalEx ? formatMoney(totals.subtotalEx.value, totals.subtotalEx.currency) : "—"}
                  </span>{" "}
                  • VAT:{" "}
                  <span className="font-semibold text-slate-700">
                    {totals.vat ? formatMoney(totals.vat.value, totals.vat.currency) : "—"}
                  </span>
                </div>
              </div>

              <Link
                href={checkoutHref}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-black text-white bg-primary rounded-xl shadow-sm hover:bg-primary/90 transition active:scale-[0.98]"
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
