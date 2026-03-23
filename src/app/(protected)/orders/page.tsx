"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney, formatDate, formatDateOnly } from "@/lib/utils";
import { ChevronRight, Package, CalendarDays } from "lucide-react";

// 1. Updated Type Definition
type Order = {
  id: string | number;
  increment_id: string;
  created_at: string; // Used for sorting (2026-01-18...)
  order_date: string; // Display date
  status: string;
  tr_delivery?: { date: string } | null; // ✅ Added Delivery Date
  total: { grand_total: { value: number; currency: string } };
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let styles = "bg-slate-100 text-slate-700 border-slate-200"; // Default

  if (s === "complete" || s === "shipped") {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (s === "canceled" || s === "closed") {
    styles = "bg-red-50 text-red-700 border-red-200";
  } else if (s === "processing") {
    styles = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {status}
    </span>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<Order[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function load(p: number) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders?page=${p}&pageSize=${pageSize}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load orders");

      let fetchedItems: Order[] = json.items || [];

      // ✅ SORTING FIX: Sort client-side by created_at (Newest First)
      fetchedItems.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setItems(fetchedItems);
      setTotalPages(json.page_info?.total_pages ?? 1);
      setTotalCount(json.total_count ?? 0);
      setPage(json.page_info?.current_page ?? p);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load orders");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1 className="page-title">Order History</h1>
          <p className="page-subtitle">
            Manage and view your recent transactions ({totalCount} total).
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin mb-2 h-6 w-6 border-b-2 border-primary rounded-full mx-auto"></div>
            Loading orders...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <Package className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No orders found</h3>
            <p className="mt-1 text-sm text-slate-500">You haven&apos;t placed any orders yet.</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="divide-y divide-slate-100">
            {/* Header Row */}
            <div className="hidden sm:grid grid-cols-12 gap-4 p-4 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-3">Order Number</div>
              <div className="col-span-2">Date Placed</div>
              <div className="col-span-2">Delivery Date</div> {/* ✅ New Header */}
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((o) => {
              const gt = o.total?.grand_total;
              // Format the delivery date if it exists
              const deliveryDate = o.tr_delivery?.date 
                ? formatDateOnly(o.tr_delivery.date) 
                : "—";

              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.increment_id}`}
                  className="group grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors text-sm"
                >
                  {/* Order ID */}
                  <div className="col-span-1 sm:col-span-3 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block sm:hidden text-xs text-slate-500 font-medium uppercase mb-0.5">Order</span>
                      <span className="font-semibold text-slate-900">#{o.increment_id}</span>
                    </div>
                  </div>

                  {/* Order Date (Use Created At or Order Date) */}
                  <div className="col-span-1 sm:col-span-2">
                    <span className="block sm:hidden text-xs text-slate-500 font-medium uppercase mb-0.5">Placed</span>
                    <span className="text-slate-600">{formatDate(o.created_at)}</span>
                  </div>

                  {/* ✅ Delivery Date Column */}
                  <div className="col-span-1 sm:col-span-2">
                     <span className="block sm:hidden text-xs text-slate-500 font-medium uppercase mb-0.5">Delivery</span>
                     <div className="flex items-center gap-2 text-slate-600">
                       {o.tr_delivery?.date && <CalendarDays className="h-3.5 w-3.5 opacity-70" />}
                       <span>{deliveryDate}</span>
                     </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 sm:col-span-2">
                    <StatusBadge status={o.status} />
                  </div>

                  {/* Total */}
                  <div className="col-span-1 sm:col-span-2 sm:text-right">
                    <span className="block sm:hidden text-xs text-slate-500 font-medium uppercase mb-0.5">Total</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {gt ? formatMoney(gt.value, gt.currency) : "—"}
                    </span>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 sm:col-span-1 flex justify-end">
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          disabled={page <= 1 || loading}
          onClick={() => load(page - 1)}
          className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <p className="text-sm text-slate-500">
          Page <span className="font-medium text-slate-900">{page}</span> of{" "}
          <span className="font-medium text-slate-900">{totalPages}</span>
        </p>

        <button
          disabled={page >= totalPages || loading}
          onClick={() => load(page + 1)}
          className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </footer>
    </main>
  );
}
