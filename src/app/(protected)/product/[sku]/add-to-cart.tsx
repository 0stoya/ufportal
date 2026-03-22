"use client";

import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Loader2, Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useCartStore } from "@/lib/cart/cartStore";

// --- Types & Helpers ---
type ResolvedMoney = {
  value_incl_tax: number;
  value_excl_tax: number;
  currency: string;
};

type ResolvedPrice = {
  custom?: ResolvedMoney | null;
  standard?: ResolvedMoney | null;
};

type ProductLike = {
  sku: string;
  name: string;
  resolved_price?: ResolvedPrice | null;
  units?: string | null;
};

function pickResolvedPrice(rp: ResolvedPrice | null | undefined): ResolvedMoney | null {
  if (!rp) return null;
  const m = rp.custom ?? rp.standard ?? null;
  if (!m) return null;
  if (typeof m.value_incl_tax !== "number" || typeof m.value_excl_tax !== "number") return null;
  return m;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function clampQty(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(999, Math.max(1, Math.floor(n)));
}

// --- Component ---

export default function AddToCart({ product }: { product: ProductLike }) {
  const refreshCart = useCartStore((s) => s.refresh);
  const resolved = useMemo(() => pickResolvedPrice(product.resolved_price), [product.resolved_price]);

  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const canBuy = !!resolved && !loading;
  const currency = resolved?.currency ?? "GBP";

  async function handleAddToCart() {
    if (!canBuy || !resolved) return;
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku: product.sku, qty }),
      });

      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Add to cart failed");

      await refreshCart().catch(() => {});
      window.dispatchEvent(new Event("cart:changed"));
      setSuccess(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Add to cart failed");
    } finally {
      setLoading(false);
    }
  }

  if (!resolved) {
    return (
      <div className="mb-8 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex gap-3 items-center">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">Pricing unavailable. Please contact support.</span>
      </div>
    );
  }

  const unitIncl = resolved.value_incl_tax;
  const unitExcl = resolved.value_excl_tax;

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 flex flex-col gap-6">
        
        {/* TOP ROW: Price Info */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatMoney(unitIncl, currency)}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">inc. VAT</span>
          </div>
          
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
             <span className="tabular-nums">{formatMoney(unitExcl, currency)} ex. VAT</span>
             {product.units && (
               <>
                <span className="text-border mx-1">|</span>
                <span className="font-medium text-foreground">{product.units}</span>
               </>
             )}
          </div>
        </div>

        {/* BOTTOM ROW: Action Bar */}
        <div className="flex gap-3 h-12">
            {/* Quantity Stepper */}
            <div className="flex items-center rounded-lg border border-border bg-background shadow-sm shrink-0">
                <button
                    type="button"
                    onClick={() => setQty((q) => clampQty(q - 1))}
                    disabled={loading || qty <= 1}
                    className="h-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors rounded-l-lg"
                >
                    <Minus className="h-4 w-4" />
                </button>

                <input
                    type="number"
                    className="w-10 h-full text-center text-lg font-bold bg-transparent border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={qty}
                    onChange={(e) => setQty(clampQty(Number(e.target.value)))}
                />

                <button
                    type="button"
                    onClick={() => setQty((q) => clampQty(q + 1))}
                    disabled={loading}
                    className="h-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors rounded-r-lg"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            {/* Add Button with MAX-WIDTH */}
            <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canBuy || success}
                className={`
                    flex-1 max-w-[250px]
                    flex items-center justify-center gap-2 rounded-lg text-base font-bold text-white shadow-sm transition-all
                    ${success 
                        ? "bg-emerald-600 hover:bg-emerald-700" 
                        : "bg-primary hover:bg-primary/90 hover:shadow-md active:scale-[0.99]"}
                    ${!canBuy ? "cursor-not-allowed opacity-50 bg-muted text-muted-foreground" : ""}
                `}
            >
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : success ? (
                    <>
                        <Check className="h-5 w-5" />
                        <span>Added</span>
                    </>
                ) : (
                    <>
                        <ShoppingCart className="h-5 w-5 opacity-90" />
                        <span>Add to cart</span>
                    </>
                )}
            </button>
        </div>

        {err && <div className="text-sm font-medium text-destructive text-center animate-pulse">{err}</div>}
      </div>
    </div>
  );
}