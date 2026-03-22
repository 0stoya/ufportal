"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, use } from "react";
import { formatMoney, formatDate, formatDateOnly } from "@/lib/utils";
import {
  ChevronLeft,
  Package,
  CalendarDays,
  CreditCard,
  Truck,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { OrderDetail } from "@/lib/magento/types";
import { useToast } from "@/components/ui/toast";
import { useCartStore } from "@/lib/cart/cartStore";

// --- Types & Helpers ---

type OrderWithUnits = OrderDetail & { unitsBySku?: Record<string, string> };

function getUnitPrice(item: any) {
  return item?.prices?.price_including_tax ?? item?.prices?.price ?? null;
}

// --- Sub-Components ---

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const s = status.toLowerCase();
  
  let colors = "bg-slate-100 text-slate-700 border-slate-200";
  if (["complete", "shipped"].includes(s)) colors = "bg-emerald-50 text-emerald-700 border-emerald-200";
  else if (["canceled", "closed"].includes(s)) colors = "bg-red-50 text-red-700 border-red-200";
  else if (s === "processing") colors = "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {status}
    </span>
  );
}

function InfoCard({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  if (!value) return null;
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <Icon className="w-4 h-4" /> {title}
      </div>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

// --- Mobile Item Card ---
function MobileItemCard({ 
  item, 
  units, 
  onAdd, 
  isAdding 
}: { 
  item: any; 
  units: string | null; 
  onAdd: () => void; 
  isAdding: boolean; 
}) {
  const unitPrice = getUnitPrice(item);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-4">
      {/* Icon / Image Placeholder */}
      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
        <Package className="w-8 h-8 opacity-50" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <Link href={`/product/${item.product_sku}`} className="font-medium text-slate-900 line-clamp-2 leading-snug">
            {item.product_name}
          </Link>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
            <span>SKU: {item.product_sku}</span>
            {units && <span className="bg-slate-100 px-1.5 rounded border border-slate-200">{units}</span>}
          </div>
        </div>
        
        <div className="mt-3 flex items-end justify-between">
          <div className="text-sm">
            <div className="font-semibold text-slate-900">
              {unitPrice ? formatMoney(unitPrice.value, unitPrice.currency) : "—"}
            </div>
            <div className="text-xs text-slate-500">Qty: {item.quantity_ordered}</div>
          </div>

          <button
            onClick={onAdd}
            disabled={isAdding}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary active:bg-primary/20 transition-colors disabled:opacity-50"
            aria-label="Add one to cart"
          >
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Desktop Item Row ---
function DesktopItemRow({ 
  item, 
  units, 
  onAdd, 
  isAdding 
}: { 
  item: any; 
  units: string | null; 
  onAdd: () => void; 
  isAdding: boolean; 
}) {
  const unitPrice = getUnitPrice(item);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <Link href={`/product/${item.product_sku}`} className="font-medium text-slate-900 hover:text-primary hover:underline">
              {item.product_name}
            </Link>
            <div className="text-xs text-slate-500 mt-1 font-mono flex items-center gap-2">
              <span>SKU: {item.product_sku}</span>
              {units && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {units}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap text-slate-600">
        {unitPrice ? formatMoney(unitPrice.value, unitPrice.currency) : "—"}
      </td>
      <td className="px-6 py-4 text-right font-medium text-slate-900">
        {item.quantity_ordered}
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={onAdd}
          disabled={isAdding}
          className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors disabled:opacity-50"
          title="Add 1 to Cart"
        >
          {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
      </td>
    </tr>
  );
}

// --- Main Page Component ---

export default function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = use(params);
  const { show } = useToast();

  const cartRefresh = useCartStore((s) => s.refresh);
  const cartSetSummary = useCartStore((s) => s.setSummary);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWithUnits | null>(null);
  const [addingItem, setAddingItem] = useState<Record<string, boolean>>({});

  const encoded = useMemo(() => encodeURIComponent(number), [number]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/orders/${encoded}`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || json?.error) throw new Error(json?.error || "Failed to load order");
        if (!cancelled) setOrder(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [encoded]);

  async function addSingleItem(sku: string, qty: number) {
    if (addingItem[sku]) return;
    setAddingItem((prev) => ({ ...prev, [sku]: true }));

    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, qty }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) throw new Error(json?.error || "Failed to add item");

      if (json?.cart?.id) cartSetSummary({ id: json.cart.id });
      if (typeof json?.cart?.total_quantity === "number") {
        cartSetSummary({ total_quantity: json.cart.total_quantity });
      }
      await cartRefresh();

      show({ type: "success", title: "Added to cart", message: `${sku} added.` });
    } catch (e: any) {
      show({ type: "error", title: "Error", message: e?.message || "Try again." });
    } finally {
      setAddingItem((prev) => ({ ...prev, [sku]: false }));
    }
  }

  // --- Loading / Error States ---

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full max-w-md mx-auto mt-20 px-4">
        <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-center">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h2 className="text-red-900 font-bold mb-2">Order Not Found</h2>
          <p className="text-red-700 mb-6 text-sm">{error || "We couldn't locate this order."}</p>
          <Link href="/orders" className="text-sm font-semibold text-red-800 underline hover:text-red-900">
            &larr; Return to Orders
          </Link>
        </div>
      </div>
    );
  }

  // --- Main Render ---

  return (
    <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/orders"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors self-start"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Orders
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              Order #{number} <StatusBadge status={order.status} />
            </h1>
            <p className="text-slate-500 mt-1">
              Placed on {formatDate(order.created_at || order.order_date)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column: Items */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Items Ordered</h2>
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                {order.items.length} Items
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">Product Details</th>
                    <th className="px-6 py-3 font-medium text-right">Price</th>
                    <th className="px-6 py-3 font-medium text-right">Qty</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item: any) => (
                    <DesktopItemRow
                      key={String(item.id)}
                      item={item}
                      units={order.unitsBySku?.[item.product_sku] ?? null}
                      isAdding={!!addingItem[item.product_sku]}
                      onAdd={() => void addSingleItem(item.product_sku, 1)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4 bg-slate-50/30">
              {order.items.map((item: any) => (
                <MobileItemCard
                  key={String(item.id)}
                  item={item}
                  units={order.unitsBySku?.[item.product_sku] ?? null}
                  isAdding={!!addingItem[item.product_sku]}
                  onAdd={() => void addSingleItem(item.product_sku, 1)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Totals & Info */}
        <div className="space-y-6">
          {/* Order Summary */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 text-lg">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-50 text-slate-600">
                <span>Subtotal <span className="text-xs text-slate-400">(Excl. Tax)</span></span>
                <span className="font-medium text-slate-900">
                  {order.total?.subtotal ? formatMoney(order.total.subtotal.value, order.total.subtotal.currency) : "—"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-50 text-slate-600">
                <span>VAT / Tax</span>
                <span className="font-medium text-slate-900">
                  {order.total?.total_tax ? formatMoney(order.total.total_tax.value, order.total.total_tax.currency) : "—"}
                </span>
              </div>

              <div className="flex justify-between py-2 pt-4">
                <span className="text-slate-900 font-bold text-base">Grand Total</span>
                <span className="text-primary font-bold text-xl">
                  {order.total?.grand_total ? formatMoney(order.total.grand_total.value, order.total.grand_total.currency) : "—"}
                </span>
              </div>
            </div>
          </section>

          {/* Logistics Info Grid */}
          <div className="grid grid-cols-1 gap-4">
            {order.tr_delivery?.date && (
              <InfoCard 
                icon={CalendarDays} 
                title="Expected Delivery" 
                value={formatDateOnly(order.tr_delivery.date)} 
              />
            )}
            
            <InfoCard 
              icon={Truck} 
              title="Shipping Method" 
              value={order.shipping_method || ""} 
            />

            {order.payment_methods?.[0]?.name && (
              <InfoCard 
                icon={CreditCard} 
                title="Payment Method" 
                value={order.payment_methods[0].name} 
              />
            )}
          </div>
        </div>

      </div>
    </main>
  );
}