"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, use } from "react";
import type { ShoppingListItem, ShoppingList } from "@/lib/magento/types.shoppingLists";
import type { CustomAttribute } from "@/lib/magento/types";
import { useToast } from "@/components/ui/toast";
import { useCartStore } from "@/lib/cart/cartStore";
import {
  ChevronLeft,
  Search,
  ShoppingBag,
  Loader2,
  Trash2,
  Save,
  ShoppingCart,
  CheckSquare,
  Square,
  Package,
} from "lucide-react";

// --- Types ---
type ApiErr = { error?: string };
type ListPayload = ShoppingList & {
  items: { total_count: number; items: ShoppingListItem[] };
};

type BusyState =
  | { kind: "idle" }
  | { kind: "savingQty" }
  | { kind: "addingAll" }
  | { kind: "addingSelected" }
  | { kind: "rowAdd"; itemId: number }
  | { kind: "rowRemove"; itemId: number };

function isBusy(b: BusyState) {
  return b.kind !== "idle";
}

// --- Helpers ---
function isApiErr(v: unknown): v is ApiErr {
  return typeof v === "object" && v !== null && "error" in v;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { ...init, cache: "no-store" });
  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    if (isApiErr(json) && json?.error) throw new Error(json.error);
    throw new Error(`Request failed (${res.status})`);
  }
  if (isApiErr(json) && json?.error) throw new Error(json.error);
  return json as T;
}

function getAttr(attrs: CustomAttribute[] | null | undefined, code: string) {
  if (!attrs?.length) return null;
  const found = attrs.find((a) => a.attribute_metadata?.code === code);
  const v = found?.entered_attribute_value?.value;
  return v == null || String(v).trim() === "" ? null : String(v);
}

function clampQty(input: string | number, fallback: number) {
  const n = typeof input === "string" ? Number(input) : Number(input);
  if (!Number.isFinite(n)) return fallback;
  const q = Math.floor(n);
  return q > 0 ? q : fallback;
}

// --- Page Component ---
export default function ListDetailPage({ params }: { params: Promise<{ list_id: string }> }) {
  const { list_id } = use(params);
  const listId = Number(list_id);

  const { show } = useToast();
  const refreshNavCart = useCartStore((s) => s.refresh);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  const [list, setList] = useState<ListPayload | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({});

  const selectedIds = useMemo(
    () => Object.keys(selected).map(Number).filter((id) => selected[id]),
    [selected]
  );

  const totalPages = useMemo(() => {
    const total = list?.items?.total_count ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [list]);

  const allOnPageSelected = useMemo(() => {
    const items = list?.items?.items ?? [];
    return items.length > 0 && items.every((it) => selected[it.item_id]);
  }, [list, selected]);

  async function load(p: number) {
    if (!Number.isFinite(listId) || listId <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<ListPayload>(`/api/shopping-lists/${listId}?page=${p}&pageSize=${pageSize}`);
      setList(data);
      setPage(p);
      const nextDraft: Record<number, string> = {};
      for (const it of data.items.items) nextDraft[it.item_id] = String(it.qty ?? 0);
      setQtyDraft(nextDraft);
      setSelected({});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load list";
      setError(msg);
      setList(null);
      show({ type: "error", title: "Load failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, [listId]);

  async function updateQuantities() {
    if (!list) return;
    setBusy({ kind: "savingQty" });
    try {
      const itemsPayload = list.items.items
        .map((it) => ({ item_id: it.item_id, qty: clampQty(qtyDraft[it.item_id] ?? String(it.qty ?? 0), Number(it.qty ?? 1)) }))
        .filter((x) => Number.isFinite(x.qty) && x.qty > 0);

      if (itemsPayload.length === 0) throw new Error("No valid quantities to update.");

      await fetchJson<{ ok: boolean }>("/api/shopping-lists/items", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      });
      show({ type: "success", title: "Saved", message: "Quantities updated." });
      await load(page);
    } catch (e: unknown) {
      show({ type: "error", title: "Save failed", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy({ kind: "idle" });
    }
  }

  async function removeItem(item_id: number) {
    if (!confirm("Remove this item?")) return;
    setBusy({ kind: "rowRemove", itemId: item_id });
    try {
      await fetchJson<{ ok: boolean }>("/api/shopping-lists/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "remove", item_id }),
      });
      show({ type: "success", title: "Removed", message: "Item removed." });
      await load(page);
    } catch (e: unknown) {
      show({ type: "error", title: "Remove failed", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy({ kind: "idle" });
    }
  }

  async function addSingleToCart(item_id: number, qty: number) {
    setBusy({ kind: "rowAdd", itemId: item_id });
    try {
      await fetchJson<{ ok: boolean }>("/api/shopping-lists/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "addSingleToCart", item_id, qty }),
      });
      await refreshNavCart();
      show({ type: "success", title: "Added", message: `Item added (x${qty}).` });
    } catch (e: unknown) {
      show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy({ kind: "idle" });
    }
  }

  async function addSelectedToCart() {
    if (!list) return;
    const itemsPayload = list.items.items
      .filter((it) => selected[it.item_id])
      .map((it) => ({ item_id: it.item_id, qty: clampQty(qtyDraft[it.item_id] ?? String(it.qty ?? 0), Number(it.qty ?? 1)) }))
      .filter((x) => Number.isFinite(x.qty) && x.qty > 0);

    if (itemsPayload.length === 0) {
      show({ type: "error", title: "Selection empty", message: "Select items with valid quantities." });
      return;
    }

    setBusy({ kind: "addingSelected" });
    try {
      await fetchJson<{ ok: boolean }>("/api/shopping-lists/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "addSelectedToCart", items: itemsPayload }),
      });
      await refreshNavCart();
      show({ type: "success", title: "Added", message: `${itemsPayload.length} items added.` });
      setSelected({});
    } catch (e: unknown) {
      show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy({ kind: "idle" });
    }
  }

  async function addWholeListToCart() {
    setBusy({ kind: "addingAll" });
    try {
      await fetchJson<{ ok: boolean }>("/api/shopping-lists/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "addListToCart", list_id: listId }),
      });
      await refreshNavCart();
      show({ type: "success", title: "Added", message: "All items added." });
    } catch (e: unknown) {
      show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy({ kind: "idle" });
    }
  }

  const toggleAll = () => {
    if (!list) return;
    if (allOnPageSelected) { setSelected({}); return; }
    const next: Record<number, boolean> = {};
    for (const it of list.items.items) next[it.item_id] = true;
    setSelected(next);
  };

  const busyRowAddId = busy.kind === "rowAdd" ? busy.itemId : null;
  const busyRowRemoveId = busy.kind === "rowRemove" ? busy.itemId : null;

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p>Loading list details...</p>
      </div>
    );
  }

  if (!list) return null;

  return (
    <main className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Link href="/lists" className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{list.list_name}</h1>
            <p className="text-sm text-slate-500 mt-1">{list.items.total_count} items • List #{listId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/search" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Search className="w-4 h-4 mr-2" /> Search
          </Link>
          <Link href="/cart" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <ShoppingBag className="w-4 h-4 mr-2" /> Cart
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />{error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-4 z-20">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary transition-colors" disabled={isBusy(busy)}>
            {allOnPageSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-slate-400" />}
            Select All
          </button>
          {selectedIds.length > 0 && <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">{selectedIds.length} selected</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button onClick={() => void updateQuantities()} disabled={isBusy(busy)} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4 mr-2" /> Save Qty
          </button>
          <button onClick={() => void addSelectedToCart()} disabled={isBusy(busy) || selectedIds.length === 0} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors">
            <ShoppingCart className="w-4 h-4 mr-2" /> Add Selected
          </button>
          <button onClick={() => void addWholeListToCart()} disabled={isBusy(busy)} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <ShoppingBag className="w-4 h-4 mr-2" /> Add List
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {list.items.items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No items in this list yet.</div>
        ) : (
          <>
            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="w-12 px-6 py-3"></th>
                    <th className="px-6 py-3 font-medium">Product</th>
                    <th className="px-6 py-3 font-medium w-32 text-center">Qty</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.items.items.map((it) => {
                    const checked = !!selected[it.item_id];
                    const qtyStr = qtyDraft[it.item_id] ?? String(it.qty ?? 0);
                    const qty = clampQty(qtyStr, Number(it.qty ?? 1));
                    const units = getAttr((it as any).product?.custom_attributes, "units");
                    const rowBusy = busyRowAddId === it.item_id || busyRowRemoveId === it.item_id;

                    return (
                      <tr key={it.item_id} className={`hover:bg-slate-50/50 transition-colors ${checked ? "bg-slate-50/80" : ""} ${rowBusy ? "opacity-50 pointer-events-none" : ""}`}>
                        <td className="px-6 py-4">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" checked={checked} onChange={(e) => setSelected((prev) => ({ ...prev, [it.item_id]: e.target.checked }))} disabled={isBusy(busy)} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <Link href={`/product/${it.sku}`} className="font-medium text-slate-900 hover:text-primary hover:underline">{it.product?.name ?? it.sku}</Link>
                              <div className="text-xs text-slate-500 mt-0.5 font-mono flex items-center gap-2">
                                <span>SKU: {it.sku}</span>
                                {units && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{units}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input type="number" min="0" value={qtyStr} onChange={(e) => setQtyDraft((prev) => ({ ...prev, [it.item_id]: e.target.value }))} className="w-full text-center rounded-lg border border-slate-300 py-1.5 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50" disabled={isBusy(busy)} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => void addSingleToCart(it.item_id, qty)} disabled={isBusy(busy)} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Add to Cart">
                              {busyRowAddId === it.item_id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ShoppingCart className="w-4 h-4" />}
                            </button>
                            <button onClick={() => void removeItem(it.item_id)} disabled={isBusy(busy)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Remove Item">
                              {busyRowRemoveId === it.item_id ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="sm:hidden divide-y divide-slate-100">
              {list.items.items.map((it) => {
                const checked = !!selected[it.item_id];
                const qtyStr = qtyDraft[it.item_id] ?? String(it.qty ?? 0);
                const qty = clampQty(qtyStr, Number(it.qty ?? 1));
                const units = getAttr((it as any).product?.custom_attributes, "units");
                const rowBusy = busyRowAddId === it.item_id || busyRowRemoveId === it.item_id;

                return (
                  <div key={it.item_id} className={`p-4 ${checked ? "bg-slate-50/80" : ""} ${rowBusy ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={checked}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [it.item_id]: e.target.checked }))}
                          disabled={isBusy(busy)}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <Link href={`/product/${it.sku}`} className="font-medium text-slate-900 hover:text-primary line-clamp-2">
                              {it.product?.name ?? it.sku}
                            </Link>
                            <div className="text-xs text-slate-500 mt-1 font-mono flex flex-wrap items-center gap-2">
                              <span>SKU: {it.sku}</span>
                              {units && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{units}</span>}
                            </div>
                          </div>
                          {/* Image Placeholder */}
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                            <Package className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Controls Row */}
                        <div className="mt-4 flex items-center gap-3">
                          <div className="w-20">
                            <input
                              type="number"
                              min="0"
                              value={qtyStr}
                              onChange={(e) => setQtyDraft((prev) => ({ ...prev, [it.item_id]: e.target.value }))}
                              className="w-full text-center rounded-lg border border-slate-300 py-2 text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                              disabled={isBusy(busy)}
                            />
                          </div>

                          <button
                            onClick={() => void addSingleToCart(it.item_id, qty)}
                            disabled={isBusy(busy)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
                          >
                            {busyRowAddId === it.item_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Cart"}
                          </button>

                          <button
                            onClick={() => void removeItem(it.item_id)}
                            disabled={isBusy(busy)}
                            className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                          >
                            {busyRowRemoveId === it.item_id ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination Footer */}
      <footer className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
        <button disabled={isBusy(busy) || page <= 1} onClick={() => void load(page - 1)} className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
          Previous
        </button>
        <p className="text-sm text-slate-500">Page <span className="font-medium text-slate-900">{page}</span> of <span className="font-medium text-slate-900">{totalPages}</span></p>
        <button disabled={isBusy(busy) || page >= totalPages} onClick={() => void load(page + 1)} className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
          Next
        </button>
      </footer>
    </main>
  );
}