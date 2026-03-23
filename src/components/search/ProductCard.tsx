"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import { PackageOpen, Tag, CalendarDays, Loader2, ShoppingCart } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { normalizeBbeYmd, daysUntilYmd, bbeText, bbeTone } from "@/lib/search/utils";
import type { Product } from "@/types/search";

interface ProductCardProps {
  product: Product;
  isRestricted: boolean;
  isAdding: boolean;
  onAdd: (sku: string) => void;
}

function ProductCardImpl({ product: p, isRestricted, isAdding, onAdd }: ProductCardProps) {
  // Price Logic
  const price = p.resolved_price?.custom ?? p.resolved_price?.standard ?? null;
  const currency = price?.currency ?? "GBP";

  // BBE Logic
  const bbeYmd = normalizeBbeYmd(p.bbe);
  const dLeft = bbeYmd ? daysUntilYmd(bbeYmd) : null;
  const showBbe = !!bbeYmd && (dLeft === null || dLeft <= 120);

  // Flags
  const isClearance = Number(p.featured_product ?? 0) === 1;
  const isSpecial = Number(p.m_special_price ?? 0) === 1;

  // Event Handlers
  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop bubbling
    if (!isRestricted && !isAdding) {
      onAdd(p.sku);
    }
  };

  return (
    <div className="group relative flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 h-full">
      
      {/* 1. Image Section */}
      <div className="relative aspect-square w-full bg-slate-50 p-6 flex items-center justify-center border-b border-slate-100 group-hover:bg-white transition-colors">
        {p.small_image ? (
          <div className="relative w-full h-full transition-transform duration-300 group-hover:scale-105">
            <Image
              src={p.small_image}
              alt={p.name}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
            />
          </div>
        ) : (
          <PackageOpen className="w-16 h-16 text-slate-300" strokeWidth={1.5} />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            {isRestricted && (
                <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-100 shadow-sm">
                    RESTRICTED
                </span>
            )}
            {!isRestricted && isClearance && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-100 shadow-sm">
                    <Tag className="w-3 h-3" /> CLEARANCE
                </span>
            )}
            {!isRestricted && isSpecial && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-100 shadow-sm">
                    <Tag className="w-3 h-3" /> OFFER
                </span>
            )}
        </div>
      </div>

      {/* 2. Content Section */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title & Link */}
        <div className="flex-1 mb-3">
            <Link href={`/product/${encodeURIComponent(p.sku)}`} className="focus:outline-none">
                <span className="absolute inset-0 z-0" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {p.name}
                </h3>
            </Link>

            {/* Metadata Chips */}
            <div className="mt-2 flex flex-wrap gap-2 relative z-10 pointer-events-none">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {p.sku}
                </span>
                {p.units && (
                    <span className="text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {p.units}
                    </span>
                )}
                 {showBbe && bbeYmd && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${bbeTone(dLeft)}`}>
                        <CalendarDays className="w-3 h-3" />
                        {bbeText(bbeYmd)}
                    </span>
                )}
            </div>
        </div>

        {/* 3. Footer (Price & Action) */}
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-3 relative z-10">
            <div className="flex flex-col">
                {price ? (
                    <>
                        <span className="text-lg font-bold text-slate-900 leading-none">
                            {formatMoney(price.value_incl_tax, currency)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                            inc. VAT
                        </span>
                    </>
                ) : (
                    <span className="text-xs text-slate-400 italic font-medium">Price unavailable</span>
                )}
            </div>

            <button
                onClick={handleAddClick}
                disabled={isAdding || isRestricted}
                className={`
                    h-9 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all focus:ring-2 focus:ring-offset-1
                    ${isRestricted 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 focus:ring-primary"}
                    ${isAdding ? "opacity-80 cursor-wait" : ""}
                `}
                aria-label={isAdding ? "Adding to cart" : `Add ${p.name} to cart`}
            >
                {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>{isRestricted ? "N/A" : "Add"}</span>
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardImpl);
