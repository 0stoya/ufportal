// src/app/api/nav/categories/route.ts
import { NextResponse } from "next/server";
import { getNavCategories } from "@/lib/magento/categories";

export const runtime = "nodejs";

export async function GET() {
  const categories = await getNavCategories();

  return NextResponse.json(
    { categories },
    {
      headers: {
        // Server fetch already caches; this just helps CDNs / edge a bit.
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    }
  );
}
