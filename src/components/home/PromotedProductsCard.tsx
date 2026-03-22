"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Star,
  Tag,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatMoney } from "@/lib/utils";

// --------------------
// Types
// --------------------

type Money = { value: number; currency: string };

type Product = {
  uid: string;
  sku: string;
  name: string;

  // TR_Portal lightweight fields
  units?: string | null;
  bbe?: string | null; // ideally YYYY-MM-DD from resolver
  featured_product?: number | null; // 1/0
  m_special_price?: number | null;  // 1/0

  small_image?: { url: string; label?: string | null } | null;

  // Portal sellable price
  price_range?: {
    minimum_price?: {
      final_price?: Money | null;
    } | null;
  } | null;
};

type PromotedTab = "featured" | "special";

type PromotedApiResponse = {
  items: Product[];
  total_count: number;
  page_info?: { current_page: number; total_pages: number };
  error?: string;
};

// --------------------
// Helpers
// --------------------

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function getResolvedPriceStrict(p: Product): Money | null {
  const m = p.price_range?.minimum_price?.final_price ?? null;
  if (!m) return null;
  if (typeof m.value !== "number" || !Number.isFinite(m.value)) return null;
  if (!m.currency || typeof m.currency !== "string") return null;
  return m;
}

function daysUntil(dateStr: string) {
  const m = String(dateStr ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  const ymd = m?.[1] ?? null;
  if (!ymd) return null;

  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatBBELabel(dateStr: string) {
  const m = String(dateStr ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  const ymd = m?.[1] ?? null;
  if (!ymd) return String(dateStr ?? "");

  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;

  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

function bbeText(dateStr: string) {
  const dLeft = daysUntil(dateStr);
  const label = formatBBELabel(dateStr);

  if (dLeft === null) return `BBE ${label}`;
  if (dLeft <= 0) return `Expired • ${Math.abs(dLeft)}d`;
  return `BBE ${label} • ${dLeft}d`;
}

function bbeTone(dLeft: number | null) {
  if (dLeft === null) return "bg-slate-100 text-slate-600 border-slate-200";
  if (dLeft <= 0) return "bg-red-50 text-red-700 border-red-200";
  if (dLeft <= 14) return "bg-amber-50 text-amber-700 border-amber-200";
  if (dLeft <= 120) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// --------------------
// Header
// --------------------

function CardHeader({
  tab,
  totalCount,
  onRefresh,
  onTab,
}: {
  tab: PromotedTab;
  totalCount: number;
  onRefresh: () => void;
  onTab: (t: PromotedTab) => void;
}) {
  const title = tab === "featured" ? "Short Dated" : "Monthly Specials";

  return (
    <div className="p-5 border-b border-slate-100 bg-white">
      {/* Top row: Title + refresh icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {tab === "featured" ? (
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            ) : (
              <Tag className="w-5 h-5 text-blue-500" />
            )}
            {title}
          </h2>

          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount > 0 ? `${totalCount} products found` : "Curated selections for you"}
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition"
          type="button"
          title="Refresh list"
          aria-label="Refresh list"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs row: more breathing room */}
      <div className="mt-4 flex">
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => onTab("featured")}
            className={cx(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              tab === "featured"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            type="button"
          >
            Short Dated
          </button>

          <button
            onClick={() => onTab("special")}
            className={cx(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              tab === "special"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            type="button"
          >
            Monthly Specials
          </button>
        </div>
      </div>
    </div>
  );
}


// --------------------
// Row
// --------------------

function ProductRow({ p }: { p: Product }) {
  const price = getResolvedPriceStrict(p);
  if (!price) return null;

  const units = (p.units ?? "").trim();
  const dLeft = p.bbe ? daysUntil(p.bbe) : null;

  // show BBE whenever present, but keep your 120d rule if you want
  const showBbe = !!p.bbe && (dLeft === null || dLeft <= 120);

  return (
    <Link
      href={`/product/${encodeURIComponent(p.sku)}`}
      className="group relative flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#4dae65] hover:shadow-md transition-all duration-200"
    >
      {/* image */}
      <div className="w-16 h-16 flex-shrink-0 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center">
        {p.small_image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.small_image.url}
            alt={p.small_image.label ?? p.name}
            className="w-full h-full object-contain mix-blend-multiply"
          />
        ) : (
          <Package className="w-6 h-6 text-slate-300" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* name */}
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-[#4dae65] transition-colors">
          {p.name}
        </h3>

        {/* badges row: BBE sits here (replacing clearance position) */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {showBbe && p.bbe ? (
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                bbeTone(dLeft)
              )}
              title={p.bbe}
            >
              <CalendarDays className="w-3 h-3" />
              {bbeText(p.bbe)}
            </span>
          ) : null}

          {/* Optional: keep a “Special” tag only if you still want it */}
          {Number(p.m_special_price ?? 0) === 1 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              <Tag className="w-3 h-3" /> Special
            </span>
          )}
        </div>

        {/* meta row: SKU + Units with icons */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            {/* SKU icon */}
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              #
            </span>
            <span className="font-mono">{p.sku}</span>
          </span>

          <span className="text-slate-300">•</span>

          {units ? (
            <span className="inline-flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800">{units}</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
              Units missing
            </span>
          )}
        </div>

        {/* price: more prominent */}
        <div className="mt-2 flex items-end justify-between">
          <span className="text-lg font-black text-slate-900 tabular-nums tracking-tight">
            {formatMoney(price.value, price.currency)}
          </span>

        </div>
      </div>
    </Link>
  );
}


// --------------------
// Pager
// --------------------

function Pager({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="p-3 border-t border-slate-100 bg-white flex justify-between items-center">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        <ChevronLeft className="w-3 h-3 mr-1" /> Prev
      </button>

      <span className="text-xs text-slate-500 font-medium">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        Next <ChevronRight className="w-3 h-3 ml-1" />
      </button>
    </div>
  );
}

// --------------------
// Component
// --------------------

type PromotedProductsCardProps = {
  pageSize?: number;
};

export default function PromotedProductsCard({ pageSize = 24 }: PromotedProductsCardProps) {
  const PAGE_SIZE = useMemo(() => Math.max(1, Math.min(99, Math.floor(pageSize))), [pageSize]);

  const [tab, setTab] = useState<PromotedTab>("featured");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount, PAGE_SIZE]);

  const reqSeq = useRef(0);

  const fetchUrl = useCallback(
    (t: PromotedTab, p: number) =>
      `/api/dashboard/promoted?type=${encodeURIComponent(t)}&pageSize=${PAGE_SIZE}&page=${encodeURIComponent(String(p))}`,
    [PAGE_SIZE]
  );

  const load = useCallback(
    async (t: PromotedTab = tab, p: number = 1) => {
      const id = ++reqSeq.current;

      setLoading(true);
      setErr(null);

      const url = fetchUrl(t, p);

      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as PromotedApiResponse | null;

        if (!res.ok) throw new Error(json?.error ?? "Failed to load products");
        if (id !== reqSeq.current) return;

        const received = (json?.items ?? []) as Product[];

        const sellable = received.filter((prod) => !!getResolvedPriceStrict(prod));
        const pageItems = sellable.slice(0, PAGE_SIZE);

        setItems(pageItems);
        setTotalCount(Number(json?.total_count ?? received.length ?? 0));
        setPage(p);
      } catch (e: unknown) {
        if (id !== reqSeq.current) return;
        const msg = e instanceof Error ? e.message : "Failed to load data";
        setErr(msg);
        setItems([]);
        setTotalCount(0);
        setPage(1);
      } finally {
        if (id === reqSeq.current) setLoading(false);
      }
    },
    [fetchUrl, PAGE_SIZE, tab]
  );

  useEffect(() => {
    void load(tab, 1);
  }, [tab, load]);

  const onPrev = () => void load(tab, Math.max(1, page - 1));
  const onNext = () => void load(tab, Math.min(totalPages, page + 1));

  const renderedRows = useMemo(() => items.map((p) => <ProductRow key={p.uid} p={p} />), [items]);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <CardHeader tab={tab} totalCount={totalCount} onRefresh={() => void load(tab, page)} onTab={setTab} />

      <div className="p-5 flex-1 bg-slate-50/50">
        {err && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {err}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-3 h-24 animate-pulse flex items-center gap-3"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !err && renderedRows.length === 0 && (
          <div className="text-center py-10">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No sellable items found (missing resolved price).</p>
          </div>
        )}

        {!loading && renderedRows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {renderedRows}
          </div>
        )}
      </div>

      {!loading && totalPages > 1 ? (
        <Pager page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} />
      ) : !loading ? (
        <div className="p-3 border-t border-slate-100 bg-white flex justify-center">
          <button
            onClick={() => void load(tab, 1)}
            className="text-xs font-medium text-slate-500 hover:text-[#4dae65] flex items-center gap-1.5 transition-colors"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>
      ) : null}
    </div>
  );
}
