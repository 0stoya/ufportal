import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import {
  QUERY_CHECKOUT_CART_SUMMARY,
  MUTATION_SET_SHIPPING_ADDRESS,
  QUERY_TR_DELIVERY_DATE,
} from "@/lib/magento/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartSummaryResp = { customerCart: { id: string } };
type TrDeliveryResp = { trDeliveryDate: unknown }; // tighten this if you have TrDeliveryDateInfo type

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { address_id?: number } | null;
  const addressId = Number(body?.address_id);

  if (!addressId) return NextResponse.json({ error: "No address" }, { status: 400 });

  try {
    const cart = await magentoGraphql<CartSummaryResp>(
      QUERY_CHECKOUT_CART_SUMMARY,
      {},
      { requireAuth: true }
    );

    const cartId = cart.customerCart.id;

    // 1) Set Address ONLY (Required to calculate delivery options)
    await magentoGraphql(
      MUTATION_SET_SHIPPING_ADDRESS,
      { cartId, addressId },
      { requireAuth: true }
    );

    // 2) Just Get the Dates
    const delivery = await magentoGraphql<TrDeliveryResp>(
      QUERY_TR_DELIVERY_DATE,
      { cartId },
      { requireAuth: true }
    );

    return NextResponse.json(delivery.trDeliveryDate);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to prepare delivery" }, { status: 500 });
  }
}
