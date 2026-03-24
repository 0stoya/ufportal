"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  CalendarDays, 
  RefreshCw, 
  LogOut, 
  ShoppingCart, 
  Package,
  AlertCircle
} from "lucide-react";
import { formatMoney, formatDateOnly } from "@/lib/utils";
import PromotedProductsCard from "@/components/home/PromotedProductsCard";

// --- Types ---

type Money = { value: number; currency: string };

type Order = {
  id: string | number;
  increment_id: string;
  created_at: string;
  order_date: string;
  status: string;
  tr_delivery?: { date: string } | null;
  total: { grand_total: Money };
};

type Props = {
  customer: { firstname: string; lastname: string; email: string };
  customerCart: { id: string; total_quantity: number };
  cartWarning?: boolean;
};

// --- Helpers ---

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = String(status ?? "").toLowerCase();
  
  let styles = "bg-slate-100 text-slate-700 border-slate-200"; 
  if (s === "complete" || s === "shipped") styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
  else if (s === "canceled" || s === "closed") styles = "bg-red-50 text-red-700 border-red-200";
  else if (s === "processing") styles = "bg-blue-50 text-blue-700 border-blue-200";
  else if (s === "pending") styles = "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span className={cx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", styles)}>
      {status}
    </span>
  );
}

// --- Components ---

function DashboardCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col h-full", className)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
           {icon && <div className="p-2 bg-slate-50 rounded-lg text-slate-500">{icon}</div>}
           <div>
             <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
             {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
           </div>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// --- Page ---
const IMAGE_CACHE_WARMED_KEY = "product-image-cache-warmed-on";

async function warmProductImageCache() {
  if (typeof window === "undefined") return;

  try {
    const warmedOn = localStorage.getItem(IMAGE_CACHE_WARMED_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (warmedOn === today) return;

    const res = await fetch("/api/products/images?pageSize=100&maxPages=10", { cache: "no-store" });
    if (!res.ok) return;

    const payload = (await res.json()) as { urls?: string[] };
    const urls = (payload.urls ?? []).slice(0, 500);

    const concurrency = 6;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (url) => {
          try {
            await fetch(url, { cache: "force-cache", mode: "no-cors" });
          } catch {
            // Ignore image warm failures; runtime cache will fill naturally as user browses.
          }
        })
      );
    }

    localStorage.setItem(IMAGE_CACHE_WARMED_KEY, today);
  } catch {
    // Ignore warm-up failures.
  }
}

export default function DashboardPage({ customer, customerCart, cartWarning }: Props) {
  const router = useRouter();
  const name = `${customer.firstname} ${customer.lastname}`.trim();
  const cartQty = Number(customerCart?.total_quantity ?? 0);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError(null);

    try {
      const res = await fetch(`/api/orders?page=1&pageSize=5`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to load recent orders");

      const fetched: Order[] = (json?.items ?? []).slice();

      // ✅ Sort Newest First
      setOrders(fetched.slice(0, 5));

      setOrders(fetched.slice(0, 5));
    } catch (e: any) {
      setOrdersError(e?.message ?? "Failed to load recent orders");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    void warmProductImageCache();
  }, []);

  async function onLogout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    try {
      localStorage.removeItem("cart_id");
      localStorage.removeItem("magento_cart_id");
    } catch {}
    router.replace("/login?loggedOut=1");
  }

  return (
    <div className="mx-auto w-full px-4 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-500">Welcome back, <span className="font-semibold text-slate-700">{name || "Guest"}</span>.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { router.refresh(); loadOrders(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 hover:border-red-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      {/* Top Row: Orders (2/3) and Cart (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <DashboardCard
            title="Recent Orders"
            subtitle="Track your latest shipments."
            icon={<CalendarDays className="h-5 w-5" />}
            action={
              <Link
                href="/orders"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {ordersError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {ordersError}
              </div>
            )}

            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 w-full bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No orders placed yet.</p>
                <Link href="/search" className="text-blue-600 font-medium text-sm mt-2 block hover:underline">Start Shopping</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orders.map((o) => {
                  const gt = o.total?.grand_total;
                  return (
                    <Link
                      key={String(o.id)}
                      href={`/orders/${o.increment_id}`}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">Order #{o.increment_id}</div>
                          <div className="text-xs text-slate-500 mt-1 flex gap-2">
                            <span>{formatDateOnly(o.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                        <StatusBadge status={o.status} />
                        <div className="font-bold text-slate-900 tabular-nums">
                          {gt ? formatMoney(gt.value, gt.currency) : "—"}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <DashboardCard
            title="Current Cart"
            subtitle="Ready to checkout?"
            icon={<ShoppingCart className="h-5 w-5" />}
          >
            {cartWarning && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                Cart synchronization delayed.
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between mb-4">
              <div>
                <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Items</span>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">{cartQty}</div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>

            <Link
              href="/cart"
              className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98]"
            >
              View Cart & Checkout
            </Link>
          </DashboardCard>
        </div>
      </div>

      {/* Bottom Row: Full Width Featured Products */}
      <div className="w-full">
        {/* We increase pageSize since it's full width now */}
        <PromotedProductsCard pageSize={99} />
      </div>

    </div>
  );
}