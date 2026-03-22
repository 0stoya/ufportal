import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import {
  MUTATION_TR_SET_DELIVERY_DATE,
  MUTATION_SET_SHIPPING_METHOD,
  QUERY_TR_DELIVERY_DATE,
} from "@/lib/magento/queries";
import type { TrDeliveryDateInfo } from "@/lib/magento/types.checkout";

type Body = { cart_id?: string; date?: string };
type TrDeliveryResp = { trDeliveryDate: TrDeliveryDateInfo };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;

  const cartId = (body?.cart_id ?? "").trim();
  const date = (body?.date ?? "").trim();

  if (!cartId) return NextResponse.json({ error: "cart_id is required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  try {
    // 1) set delivery date (Amasty rules validated by your resolver)
    await magentoGraphql(
      MUTATION_TR_SET_DELIVERY_DATE,
      { cartId, date },
      { requireAuth: true }
    );

    // 2) now we can set your single shipping method
    await magentoGraphql(
      MUTATION_SET_SHIPPING_METHOD,
      { cartId, carrier: "simpleshipping", method: "simpleshipping" },
      { requireAuth: true }
    );

    // 3) return updated delivery info for UI
    const delivery = await magentoGraphql<TrDeliveryResp>(
      QUERY_TR_DELIVERY_DATE,
      { cartId },
      { requireAuth: true }
    );

    return NextResponse.json({
      ok: true,
      cart_id: cartId,
      delivery: delivery.trDeliveryDate,
      next_step: "payment_and_place_order",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to set delivery date";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
