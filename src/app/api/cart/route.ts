import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_CART } from "@/lib/magento/queries";
import type { Cart } from "@/lib/magento/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resp = { customerCart: Cart };

export async function GET() {
  try {
    const data = await magentoGraphql<Resp>(QUERY_CART, {}, { requireAuth: true });
    return NextResponse.json(data.customerCart);
  } catch (e: any) {
    const msg = e?.message ?? "Failed to load cart";
    const isAuth = /401|unauthorized|not authenticated/i.test(msg);
    return NextResponse.json({ error: isAuth ? "Unauthorized" : msg }, { status: isAuth ? 401 : 500 });
  }
}
