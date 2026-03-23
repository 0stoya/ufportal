import Link from "next/link";
import Image from "next/image";
import { MagentoGraphqlError, magentoGraphql } from "@/lib/magento/fetchGraphql";
import CategoryFiltersBar from "@/components/category/CategoryFiltersBar";

export const runtime = "nodejs";
export const revalidate = 300;

const QUERY_CATEGORY_BY_URL_PATH = /* GraphQL */ `
  query CategoryByUrlPath($filters: CategoryFilterInput!) {
    categoryList(filters: $filters) {
      id
      name
      url_path
      children {
        id
        name
        url_path
      }
    }
  }
`;

const QUERY_PRODUCTS_BY_CATEGORY_ID = /* GraphQL */ `
  query ProductsByCategory(
    $filter: ProductAttributeFilterInput
    $pageSize: Int!
    $currentPage: Int!
    $sort: ProductAttributeSortInput
  ) {
    products(filter: $filter, pageSize: $pageSize, currentPage: $currentPage, sort: $sort) {
      total_count
      items {
        id
        sku
        name
        small_image {
          url
        }
        resolved_price {
          custom { value_incl_tax value_excl_tax currency }
          standard { value_incl_tax value_excl_tax currency }
        }
      }
      page_info {
        current_page
        page_size
        total_pages
      }
    }
  }
`;

type CategoryResp = {
  categoryList: Array<{
    id: number;
    name: string;
    url_path: string;
    children?: Array<{ id: number; name: string; url_path: string }> | null;
  }>;
};

type Money = { value_incl_tax: number; value_excl_tax: number; currency: string };
type Product = {
  id: number;
  sku: string;
  name: string;
  small_image?: { url?: string | null } | null;
  resolved_price?: { custom?: Money | null; standard?: Money | null } | null;
};

type ProductsResp = {
  products: {
    total_count: number;
    items: Product[];
    page_info: { current_page: number; page_size: number; total_pages: number };
  };
};

function formatMoney(m?: Money | null) {
  if (!m) return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: m.currency || "GBP",
  }).format(m.value_incl_tax);
}

function pickPrice(p: Product) {
  return p.resolved_price?.custom ?? p.resolved_price?.standard ?? null;
}

function safeInt(v: string | undefined, fallback: number) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampPageSize(v: string | undefined) {
  const n = Number(v);
  if (n === 48 || n === 96) return n;
  return 24;
}

function buildQueryString(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v == null) continue;
    const t = String(v).trim();
    if (!t) continue;
    params.set(k, t);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function isUnsupportedStockStatusFilterError(e: unknown) {
  if (!(e instanceof MagentoGraphqlError)) return false;
  return e.errors.some((err) =>
    err.message.includes('Field "stock_status" is not defined by type "ProductAttributeFilterInput"')
  );
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { path } = await params;
  const sp = (await searchParams) ?? {};
  const urlPath = (path ?? []).join("/");

  // Filters (skip price)
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const inStock = sp.in_stock === "1";
  const sort = typeof sp.sort === "string" ? sp.sort : "relevance";
  const page = safeInt(typeof sp.page === "string" ? sp.page : undefined, 1);
  const pageSize = clampPageSize(typeof sp.ps === "string" ? sp.ps : undefined);

  // 1) Resolve category by url_path
  const catData = await magentoGraphql<CategoryResp>(
    QUERY_CATEGORY_BY_URL_PATH,
    { filters: { url_path: { eq: urlPath } } },
    { cache: "force-cache", next: { revalidate: 300, tags: [`cat:${urlPath}`] } }
  );

  const category = catData.categoryList?.[0];

  if (!category) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Category not found</h1>
        <p className="text-sm text-muted-foreground">
          Couldn’t resolve: <span className="font-mono">{urlPath}</span>
        </p>
        <Link href="/search" className="text-sm font-semibold underline">
          Go to Search
        </Link>
      </div>
    );
  }

  // 2) Build Magento filter + sort
  const filter: any = {
    category_id: { eq: String(category.id) },
  };

  if (q) {
    // Name match within category
    filter.name = { match: q };
  }

  if (inStock) {
    // Magento supports stock_status filter in many setups. If yours doesn’t,
    // we transparently retry without it below.
    filter.stock_status = { eq: "IN_STOCK" };
  }

  const sortInput: any =
    sort === "name_asc"
      ? { name: "ASC" }
      : sort === "name_desc"
        ? { name: "DESC" }
        : undefined;

  let prodData: ProductsResp;
  try {
    prodData = await magentoGraphql<ProductsResp>(
      QUERY_PRODUCTS_BY_CATEGORY_ID,
      {
        filter,
        pageSize,
        currentPage: page,
        sort: sortInput,
      },
      { cache: "force-cache", next: { revalidate: 300, tags: [`cat:${category.id}`] } }
    );
  } catch (e: unknown) {
    if (inStock && isUnsupportedStockStatusFilterError(e)) {
      const fallbackFilter = { ...filter };
      delete fallbackFilter.stock_status;

      prodData = await magentoGraphql<ProductsResp>(
        QUERY_PRODUCTS_BY_CATEGORY_ID,
        {
          filter: fallbackFilter,
          pageSize,
          currentPage: page,
          sort: sortInput,
        },
        { cache: "force-cache", next: { revalidate: 300, tags: [`cat:${category.id}`] } }
      );
    } else {
      throw e;
    }
  }

  const { items, total_count, page_info } = prodData.products;

  // Build pagination URLs while preserving filters
  const baseQS = {
    q: q || undefined,
    in_stock: inStock ? "1" : undefined,
    sort: sort !== "relevance" ? sort : undefined,
    ps: pageSize !== 24 ? String(pageSize) : undefined,
  };

  const prevHref = `/c/${category.url_path}${buildQueryString({
    ...baseQS,
    page: page > 1 ? String(page - 1) : undefined,
  })}`;

  const nextHref = `/c/${category.url_path}${buildQueryString({
    ...baseQS,
    page: page < page_info.total_pages ? String(page + 1) : undefined,
  })}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{category.url_path}</div>
          <h1 className="text-2xl font-bold truncate">{category.name}</h1>
          <div className="text-sm text-muted-foreground">{total_count} products</div>
        </div>

        <Link
          href="/search"
          className="shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          Search
        </Link>
      </div>

      {/* Child category pills */}
      {category.children?.length ? (
        <div className="flex flex-wrap gap-2">
          {category.children.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.url_path}`}
              className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Filters */}
      <CategoryFiltersBar />

      {/* Product grid */}
      {items.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6">
          {items.map((p) => {
            const price = pickPrice(p);
            const img = p.small_image?.url || null;

            return (
              <Link
                key={p.id}
                href={`/product/${encodeURIComponent(p.sku)}`}
                className="group rounded-2xl border bg-card p-3 hover:shadow-sm transition-shadow"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {img ? (
                    <Image
                      src={img}
                      alt={p.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>

                <div className="mt-2 space-y-1">
                  <div className="line-clamp-2 text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                  <div className="text-sm font-bold">{formatMoney(price)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          No products found{q ? " for this search." : " in this category."}
        </div>
      )}

      {/* Pagination */}
      {page_info.total_pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Link
            href={prevHref}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted",
              page <= 1 && "pointer-events-none opacity-50"
            )}
          >
            Previous
          </Link>

          <div className="text-sm text-muted-foreground">
            Page {page_info.current_page} / {page_info.total_pages}
          </div>

          <Link
            href={nextHref}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted",
              page >= page_info.total_pages && "pointer-events-none opacity-50"
            )}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}

// tiny cn helper to avoid importing it globally
function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}
