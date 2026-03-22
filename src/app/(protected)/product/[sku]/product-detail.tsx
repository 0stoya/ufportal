"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { 
  ChevronLeft, 
  ShoppingCart, 
  Loader2, 
  Minus, 
  Plus, 
  Package,
  CheckCircle2
} from "lucide-react";
import type { ProductPdp } from "@/lib/magento/products";
import type { CustomAttribute } from "@/lib/magento/types";
import { formatMoney } from "@/lib/utils";
import AllergenIcons from "./allergen-icons";
import TabbedInfo from "./tabbed-info";

// --- Helper ---
function getAttrValue(attrs: CustomAttribute[] | null | undefined, code: string) {
  if (!attrs) return null;
  const found = attrs.find((a) => a.attribute_metadata?.code === code);
  return found?.entered_attribute_value?.value ?? null;
}

export default function ProductDetail({ product }: { product: ProductPdp }) {
  const [qty, setQty] = useState<number | ""> (1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const price = useMemo(
    () => product.resolved_price?.custom ?? product.resolved_price?.standard,
    [product]
  );
  const currency = price?.currency ?? "GBP";

  // Extract Units
  const units = getAttrValue(product.custom_attributes, "units");

  async function addToCart() {
    const finalQty = typeof qty === 'number' ? qty : 1;
    setBusy(true);
    setMsg(null);
    
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku: product.sku, qty: finalQty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Add to cart failed");
      
      setMsg({ type: 'success', text: `Added ${finalQty} × ${product.name} to cart` });
      
      // Optional: Reset qty after add? Usually B2B users might add again, so keeping it is fine.
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message ?? "Add to cart failed" });
    } finally {
      setBusy(false);
    }
  }

  // Stepper Handlers
  const handleQtyChange = (val: string) => {
    if (val === "") {
      setQty("");
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) setQty(num);
  };

  const inc = () => setQty(prev => (typeof prev === 'number' ? prev + 1 : 1));
  const dec = () => setQty(prev => (typeof prev === 'number' && prev > 1 ? prev - 1 : 1));
  const blurQty = () => { if (qty === "") setQty(1); };

  return (
    <div className="grid gap-8 lg:grid-cols-[500px_1fr]">
      
      {/* LEFT COLUMN: Image */}
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {product.small_image?.url ? (
            <Image
              src={product.small_image.url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-contain p-6"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400 bg-slate-50">
              <Package className="h-12 w-12 opacity-20" />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Details */}
      <div className="min-w-0 flex flex-col h-full">
        
        {/* Navigation & Header */}
        <div className="mb-6 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link
              href="/search"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Search
            </Link>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
            {product.name}
          </h1>

          {/* SKU & UNITS ROW - Units Pop Here */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-mono text-slate-600">
              SKU: {product.sku}
            </div>

            {units && (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 shadow-sm">
                <Package className="h-4 w-4" />
                {units}
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Cart Action Area */}
        <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            
            {/* Price Block */}
            <div>
              {price ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {formatMoney(price.value_incl_tax, currency)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">inc. VAT</span>
                  </div>
                  <div className="text-sm font-medium text-slate-400 mt-1">
                    {formatMoney(price.value_excl_tax, currency)} excl. VAT
                  </div>
                </>
              ) : (
                <div className="text-xl text-slate-400 italic font-medium">Price unavailable</div>
              )}
            </div>

            {/* Interactive Stepper & Add Button */}
            <div className="flex items-stretch gap-3 w-full sm:w-auto h-12">
              {/* Stepper */}
              <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden w-36 shrink-0">
                <button 
                  onClick={dec}
                  className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 border-r border-slate-100 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  onBlur={blurQty}
                  className="flex-1 w-full h-full text-center font-bold text-slate-900 outline-none focus:bg-blue-50/50 transition-colors"
                />
                <button 
                  onClick={inc}
                  className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 border-l border-slate-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={addToCart}
                disabled={busy || !price}
                className="flex-1 sm:flex-none px-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white font-bold shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          {msg && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border animate-in fade-in slide-in-from-top-1 ${
              msg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {msg.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {msg.text}
            </div>
          )}
        </div>

        {/* Product Information Tabs & Allergens */}
        <div className="space-y-8">
          <AllergenIcons customAttributes={product.custom_attributes} />
          <TabbedInfo
  sku={product.sku}
  customAttributes={product.custom_attributes}
/>
        </div>

      </div>
    </div>
  );
}