// src/app/api/dashboard/promoted/route.ts
import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { clearCustomerToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IMPORTANT
 * - "featured" uses featured_product = 1
 * - "special" uses m_special_price = 1 (your custom boolean attribute)
 * - Supports pagination via currentPage + pageSize
 * - Returns total_count + page_info for UI
 */

type PromotedType = "featured" | "special";

type ProductsResponse = {
  products: {
    total_count: number;
    page_info: { current_page: number; total_pages: number };
    items: Array<{
      uid: string;
      sku: string;
      name: string;
      small_image?: { url: string; label?: string | null } | null;
      price_range?: {
        minimum_price?: {
          final_price?: { value: number; currency: string } | null;
          regular_price?: { value: number; currency: string } | null;
        } | null;
      } | null;

      // units may appear top-level and/or in custom_attributes
      units?: string | null;
      custom_attributes?: Array<{
        attribute_metadata?: { code?: string | null; label?: string | null } | null;
        entered_attribute_value?: { value?: string | null } | null;
      }> | null;

      featured_product?: any;
      m_special_price?: any;
      bbe?: string | null;
    }>;
  };
};

const QUERY_PROMOTED = /* GraphQL */ `
  query PromotedProducts(
    $filter: ProductAttributeFilterInput!
    $pageSize: Int!
    $currentPage: Int!
  ) {
    products(filter: $filter, pageSize: $pageSize, currentPage: $currentPage) {
      total_count
      page_info {
        current_page
        total_pages
      }
      items {
        uid
        sku
        name

        small_image {
          url
          label
        }

        price_range {
          minimum_price {
            final_price {
              value
              currency
            }
            regular_price {
              value
              currency
            }
          }
        }

        # Units used in the UI (sometimes also exposed via custom_attributes)
        units
        custom_attributes {
          attribute_metadata {
            code
            label
          }
          entered_attribute_value {
            value
          }
        }

        # Promoted flags
        featured_product
        m_special_price

        # Date
        bbe
      }
    }
  }
`;

function clampInt(v: unknown, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function parseType(raw: string | null): PromotedType | null {
  if (!raw) return "featured";
  if (raw === "featured" || raw === "special") return raw;
  return null;
}

function buildFilter(type: PromotedType) {
  // Booleans commonly filter as "1"/"0" for EAV attributes.
  // Your screenshots confirm { eq: "1" } works.
  return type === "featured"
    ? { featured_product: { eq: "1" } }
    : { m_special_price: { eq: "1" } };
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const type = parseType(url.searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  // Default to 8 to match your UI expectation
  const pageSize = clampInt(url.searchParams.get("pageSize"), 8, 1, 24);
  const page = clampInt(url.searchParams.get("page"), 1, 1, 9999);

  const filter = buildFilter(type);

  try {
    const data = await magentoGraphql<ProductsResponse>(
      QUERY_PROMOTED,
      { filter, pageSize, currentPage: page },
      { requireAuth: true }
    );

    const products = data.products;

    return NextResponse.json(
      {
        items: products?.items ?? [],
        total_count: products?.total_count ?? 0,
        page_info: products?.page_info ?? { current_page: page, total_pages: 1 },

        // Helpful while you’re validating in UI; remove once confirmed
        debug: { type, page, pageSize, filter }
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    if (e instanceof MagentoUnauthorizedError) {
      await clearCustomerToken();
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { error: e?.message ?? "Failed to load promoted products" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
