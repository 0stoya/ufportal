import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_CART_ID } from "@/lib/magento/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resp = { customerCart: { id: string; total_quantity: number } };

export async function GET() {
  try {
    const data = await magentoGraphql<Resp>(QUERY_CART_ID, {}, { requireAuth: true });
    return NextResponse.json({
      id: data.customerCart.id,
      total_quantity: data.customerCart.total_quantity ?? 0,
    });
  } catch (e: any) {
    const msg = e?.message ?? "Failed to load cart summary";
    const isAuth = /401|unauthorized|not authenticated/i.test(msg);
    return NextResponse.json({ error: isAuth ? "Unauthorized" : msg }, { status: isAuth ? 401 : 500 });
  }
}
