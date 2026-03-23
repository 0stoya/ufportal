// app/api/search/route.ts
import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_PRODUCTS_BY_SKUS } from "@/lib/magento/queries";
import { typesenseServer } from "@/lib/typesense/server";
import { TYPESENSE_COLLECTION, SEARCH_CONFIG } from "@/lib/typesense/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_PAGE_SIZE = 96;

// --- Types ---
type Money = { value_incl_tax: number; value_excl_tax: number; currency: string };

type Product = {
  id: number;
  sku: string;
  name: string;
  small_image?: string | null;
  resolved_price?: {
    custom?: Money | null;
    standard?: Money | null;
  } | null;
};

type MagentoProductRaw = Product & {
  small_image?: { url?: string | null } | null;
};

type RespBySkus = {
  products: { items: MagentoProductRaw[] };
};

// --- Helpers ---
function normalizeSku(s: string) {
  return s.trim().toUpperCase();
}

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function uniqKeepOrder(skus: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skus) {
    const k = normalizeSku(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function orderProductsBySku(products: Product[], skus: string[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) map.set(normalizeSku(p.sku), p);

  const ordered: Product[] = [];
  for (const sku of skus) {
    const p = map.get(normalizeSku(sku));
    if (p) ordered.push(p);
  }
  return ordered;
}

function extractHitSkus(hits: Array<{ document?: { sku?: string; id?: string } }> = []) {
  return uniqKeepOrder(
    hits
      .map((h) => String(h.document?.sku || h.document?.id || "").trim())
      .filter(Boolean)
  );
}

// --- Handler ---
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = toPositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(toPositiveInt(searchParams.get("pageSize"), 48), MAX_PAGE_SIZE);

  // 1. Fast exit on empty query
  if (!q || q.length < 2) {
    return NextResponse.json({
      mode: "strict",
      items: [],
      total_count: 0,
      page_info: { current_page: page, total_pages: 0 },
    });
  }

  // 2. Typesense Query using SHARED CONFIG
  const searchParamsTs = {
    q,
    page,
    per_page: pageSize,
    ...SEARCH_CONFIG, // <-- Uses exact same weights/typos as Client
  };

  try {
    let tsRes = await typesenseServer
      .collections(TYPESENSE_COLLECTION)
      .documents()
      .search(searchParamsTs as any); // Cast valid here due to lib definition lag

    const found = Number(tsRes.found ?? 0);
    const totalPages = Math.max(1, Math.ceil(found / pageSize));

    // If a stale/high page number was requested, fetch the last real page
    // so users don't land on an empty result screen when matches still exist.
    const currentPage = Math.min(page, totalPages);
    if (found > 0 && currentPage !== page) {
      tsRes = await typesenseServer
        .collections(TYPESENSE_COLLECTION)
        .documents()
        .search({ ...searchParamsTs, page: currentPage } as any);
    }

    // 3. Extract SKUs
    const hitSkus = extractHitSkus(tsRes.hits as Array<{ document?: { sku?: string; id?: string } }>);

    if (hitSkus.length === 0) {
      return NextResponse.json({
        mode: "strict",
        items: [],
        total_count: found,
        page_info: { current_page: currentPage, total_pages: found > 0 ? totalPages : 0 },
      });
    }

    // 4. Hydrate via Magento
    const magRes = await magentoGraphql<RespBySkus>(
      QUERY_PRODUCTS_BY_SKUS,
      { skus: hitSkus, pageSize: hitSkus.length },
      { requireAuth: true }
    );

    const rawItems = magRes.products.items || [];
    
    // 5. Clean Data
    const cleanItems: Product[] = rawItems.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      resolved_price: p.resolved_price,
      small_image: p.small_image?.url || null,
    }));

    // 6. Restore Typesense Relevance Order
    const items = orderProductsBySku(cleanItems, hitSkus);

    return NextResponse.json(
      {
        mode: "strict",
        items,
        total_count: found,
        page_info: { current_page: currentPage, total_pages: found > 0 ? totalPages : 0 },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
