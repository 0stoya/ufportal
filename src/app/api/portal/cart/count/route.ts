import { NextResponse } from "next/server";
import type { Cart } from "@/lib/magento/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IMPORTANT:
 * This route intentionally derives count from the SAME cart endpoint
 * your UI uses (/api/cart) so it always matches what users see.
 */
export async function GET(req: Request) {
  try {
    // Build absolute URL to call internal route with same cookies
    const url = new URL("/api/cart", req.url);

    const res = await fetch(url, {
      method: "GET",
      // forward cookies so it reads the correct cart context
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as Cart | { error?: string } | null;

    if (!res.ok || !json || (typeof json === "object" && "error" in json && json.error)) {
      return NextResponse.json({ count: 0, line_items: 0 });
    }

    const items = (json as Cart).items ?? [];

    // Badge should show TOTAL QTY (3 items), not sku count (2)
    const totalQty = items.reduce((sum, it) => sum + Number(it.quantity ?? 0), 0);
    const count = Number.isFinite(totalQty) ? totalQty : 0;

    // Helpful for debugging / future UI (optional)
    const lineItems = items.length;

    return NextResponse.json({ count, line_items: lineItems });
  } catch {
    return NextResponse.json({ count: 0, line_items: 0 });
  }
}
