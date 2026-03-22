"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { Package } from "lucide-react";

// --- Types ---

type ResolvedMoney = {
  value_incl_tax: number;
  value_excl_tax: number;
  currency: string;
};

type ResolvedPrice = {
  custom?: ResolvedMoney | null;
  standard?: ResolvedMoney | null;
};

interface BrandItem {
  id: number;
  sku: string;
  name: string;
  small_image?: { url?: string | null } | null;
  units?: string | null;
  resolved_price?: ResolvedPrice | null;
}

interface BrandBlockData {
  title: string;
  items: BrandItem[];
}

// --- Helpers ---

function pickPrice(rp: ResolvedPrice | null | undefined): ResolvedMoney | null {
  if (!rp) return null;
  const m = rp.custom ?? rp.standard ?? null;
  if (!m) return null;
  if (typeof m.value_incl_tax !== "number" || !Number.isFinite(m.value_incl_tax)) return null;
  if (typeof m.value_excl_tax !== "number" || !Number.isFinite(m.value_excl_tax)) return null;
  if (!m.currency) return null;
  return m;
}

// --- Component ---

export default function MoreFromBrand({ data }: { data: BrandBlockData | null }) {
  if (!data?.items?.length) return null;

  return (
    <section className="mt-12 border-t border-slate-100 pt-8 pb-8">
      <div className="mb-6 px-4 md:px-0">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          {data.title}
        </h2>
      </div>

      {/* Grid Layout: 2 columns on mobile, 3 on tablet, 5 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 px-4 md:px-0">
        {data.items.map((item) => {
          const price = pickPrice(item.resolved_price);
          const units = (item.units ?? "").trim();

          return (
            <Link
              key={item.id}
              href={`/product/${encodeURIComponent(item.sku)}`}
              className="group flex flex-col h-full w-full"
            >
              {/* Image Card */}
              <div className="aspect-square relative rounded-xl border border-slate-200 bg-slate-50 mb-3 overflow-hidden">
                {item.small_image?.url ? (
                  <Image
                    src={item.small_image.url}
                    alt={item.name}
                    fill
                    className="object-contain p-4 transition-transform duration-300 group-hover:scale-105 mix-blend-multiply"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-100">
                    <Package className="w-8 h-8 opacity-50 mb-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">No Image</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 space-y-2">
                {/* Title */}
                <h3 className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors min-h-[2.5em]">
                  {item.name}
                </h3>

                {/* SKU / Units */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    {item.sku}
                  </span>
                  {units && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {units}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-auto pt-1">
                  {price ? (
                    <div className="text-base md:text-lg font-bold text-slate-900">
                      {formatMoney(price.value_incl_tax, price.currency)}
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded">
                      Sold Out
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}