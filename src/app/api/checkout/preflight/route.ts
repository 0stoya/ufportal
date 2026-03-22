import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_CHECKOUT_CART_SUMMARY } from "@/lib/magento/queries";
import { prepShippingAndDelivery } from "@/lib/checkout/prep";

type CartSummaryResp = { customerCart: { id: string } };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { address_id?: number; delivery_date?: string }
    | null;

  const addressId = Number(body?.address_id);
  const deliveryDate = String(body?.delivery_date ?? "").trim();

  if (!Number.isFinite(addressId) || addressId <= 0) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  try {
    const cart = await magentoGraphql<CartSummaryResp>(
      QUERY_CHECKOUT_CART_SUMMARY,
      {},
      { requireAuth: true }
    );

    await prepShippingAndDelivery({
      cartId: cart.customerCart.id,
      addressId,
      deliveryDate,
      carrier: "simpleshipping",
      method: "simpleshipping",
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    // IMPORTANT: do not surface preflight errors to customer
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
