import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";

const QUERY_PRODUCT_IMAGE_URLS = /* GraphQL */ `
  query ProductImageUrls($pageSize: Int!, $currentPage: Int!) {
    products(search: "", pageSize: $pageSize, currentPage: $currentPage) {
      items {
        small_image {
          url
        }
      }
      page_info {
        current_page
        total_pages
      }
    }
  }
`;

type ProductImagesResponse = {
  products: {
    items: Array<{ small_image?: { url?: string | null } | null }>;
    page_info?: { current_page?: number | null; total_pages?: number | null } | null;
  };
};

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pageSize = parsePositiveInt(searchParams.get("pageSize"), 100, 250);
  const maxPages = parsePositiveInt(searchParams.get("maxPages"), 20, 200);

  const urls = new Set<string>();
  let pagesScanned = 0;
  let totalPages = 1;

  for (let currentPage = 1; currentPage <= maxPages; currentPage += 1) {
    const data = await magentoGraphql<ProductImagesResponse>(
      QUERY_PRODUCT_IMAGE_URLS,
      { pageSize, currentPage },
      { requireAuth: false, cache: "no-store" }
    );

    pagesScanned = currentPage;
    totalPages = data.products.page_info?.total_pages ?? currentPage;

    for (const item of data.products.items ?? []) {
      const url = item.small_image?.url;
      if (url) urls.add(url);
    }

    if (currentPage >= totalPages) break;
  }

  return NextResponse.json({
    urls: Array.from(urls),
    pagesScanned,
    totalPages,
    pageSize,
  });
}
