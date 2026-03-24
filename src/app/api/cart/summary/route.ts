import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { QUERY_CART_ID } from "@/lib/magento/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type Resp = { customerCart: { id: string; total_quantity: number } };

export async function GET() {
  try {
    const data = await magentoGraphql<Resp>(QUERY_CART_ID, {}, { requireAuth: true });
    return NextResponse.json(
      {
        id: data.customerCart.id,
        total_quantity: data.customerCart.total_quantity ?? 0,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e: unknown) {
    if (e instanceof MagentoUnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const msg = e instanceof Error ? e.message : "Failed to load cart summary";
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
