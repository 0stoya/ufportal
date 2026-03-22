"use client";

import Link from "next/link";
import { useState } from "react";
import { useBootstrap } from "@/components/bootstrap/BootstrapProvider";
import { useToast } from "@/components/ui/toast";
import { useCartStore } from "@/lib/cart/cartStore";
import { safeJson } from "@/lib/search/utils";
import { useProductSearch } from "@/hooks/useProductSearch";

import { ChevronLeft, Search, AlertCircle } from "lucide-react";
import { ProductCard } from "@/components/search/ProductCard";
import { SearchBar } from "@/components/search/SearchBar";
import { Pagination } from "@/components/search/Pagination";

export default function SearchPage() {
  const { restrictedSkuSet } = useBootstrap();
  const { show } = useToast();
  const refreshNavCart = useCartStore((s) => s.refresh);

  // Hook handles all search state
  const { 
    q, setQ, page, loading, data, error, 
    totalPages, canSearch, goToPage, pageSize 
  } = useProductSearch();

  const [addingSku, setAddingSku] = useState<string | null>(null);

  async function addToCart(sku: string) {
    const normalized = sku.trim().toUpperCase();

    if (restrictedSkuSet.has(normalized)) {
      show({ type: "error", title: "Restricted", message: "Product not available for your account." });
      return;
    }

    setAddingSku(sku);
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, qty: 1 }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error ?? "Add failed");

      await refreshNavCart();
      show({ type: "success", title: "Added", message: `${sku} added.` });
    } catch (e: any) {
      show({ type: "error", title: "Error", message: e.message });
    } finally {
      setAddingSku(null);
    }
  }

  const modeLabel = !canSearch ? null : data.mode === "strict" ? "Best matches" : "Broader matches";

  return (
    <main className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Link href="/orders" className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Search</h1>
            <p className="text-sm text-slate-500 mt-1">
              {canSearch ? `${data.total_count} results • ${pageSize} per page` : "Find products by name or SKU."}
              {modeLabel && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-slate-200 bg-white text-slate-600">
                  {modeLabel}
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Search Input */}
      <SearchBar 
        value={q} 
        onChange={setQ} 
        loading={loading} 
      />

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          {error}
        </div>
      )}

      {/* Content Area */}
      <section className="space-y-6">
        
        {/* Empty States */}
        {!loading && !canSearch && data.items.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Ready to search</h3>
            <p className="text-slate-500 mt-1">Enter at least 2 characters to begin.</p>
          </div>
        )}

        {!loading && canSearch && data.items.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            <p className="text-slate-500">No products found for &quot;<span className="font-medium text-slate-900">{q}</span>&quot;.</p>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {data.items.map((p) => (
            <ProductCard 
              key={p.id} 
              product={p} 
              isRestricted={restrictedSkuSet.has(p.sku.trim().toUpperCase())}
              isAdding={addingSku === p.sku}
              onAdd={addToCart}
            />
          ))}
        </div>

        {/* Pagination */}
        {canSearch && data.items.length > 0 && (
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            loading={loading} 
            onPageChange={goToPage} 
          />
        )}
      </section>
    </main>
  );
}