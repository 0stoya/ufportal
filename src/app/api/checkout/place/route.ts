import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import {
  QUERY_CHECKOUT_CART_SUMMARY,
  MUTATION_SET_PAYMENT_METHOD_PURCHASEORDER,
  MUTATION_PLACE_ORDER,
} from "@/lib/magento/queries";
import { prepShippingAndDelivery } from "@/lib/checkout/prep";

type CartSummaryResp = { customerCart: { id: string } };

type PlaceOrderResp = {
  placeOrder: { order: { order_number: string } };
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { 
        address_id?: number; 
        po_number?: string; 
        delivery_date?: string | null;
        captcha_token?: string;
      }
    | null;

  const addressId = Number(body?.address_id);
  const poNumber = String(body?.po_number ?? "").trim();
  const deliveryDate = body?.delivery_date ? String(body.delivery_date).trim() : null;
  const captchaToken = body?.captcha_token;

  // 1. Basic Validation
  if (!Number.isFinite(addressId) || addressId <= 0) {
    return NextResponse.json({ error: "address_id is required" }, { status: 400 });
  }
  if (!poNumber) {
    return NextResponse.json({ error: "po_number is required" }, { status: 400 });
  }
  if (!deliveryDate || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
    return NextResponse.json({ error: "delivery_date is required (YYYY-MM-DD)" }, { status: 400 });
  }
  
  // ✅ Check presence, but DO NOT verify with Google here.
  // We must pass this fresh token to Magento so it can verify it.
  if (!captchaToken) {
    return NextResponse.json({ error: "Please complete the captcha" }, { status: 400 });
  }

  try {
    const cart = await magentoGraphql<CartSummaryResp>(
      QUERY_CHECKOUT_CART_SUMMARY,
      {},
      { requireAuth: true }
    );
    const cartId = cart.customerCart.id;

    await prepShippingAndDelivery({
      cartId,
      addressId,
      deliveryDate,
      carrier: "simpleshipping",
      method: "simpleshipping",
    });

    await magentoGraphql(
      MUTATION_SET_PAYMENT_METHOD_PURCHASEORDER,
      { cartId, poNumber },
      { requireAuth: true }
    );

    // ✅ PASS THE TOKEN TO MAGENTO
    // Magento looks for the "X-ReCaptcha" header by default
    const placed = await magentoGraphql<PlaceOrderResp>(
      MUTATION_PLACE_ORDER,
      { cartId },
      { 
        requireAuth: true,
        // Ensure your magentoGraphql helper supports a 'headers' option:
        headers: {
          "X-ReCaptcha": captchaToken 
        }
      }
    );

    return NextResponse.json({
      ok: true,
      order_increment_id: placed.placeOrder.order.order_number,
    });
  } catch (e: any) {
    // If Magento rejects the captcha, the error will be caught here
    const msg = e instanceof Error ? e.message : "Checkout failed";
    console.error("Place Order Error:", msg);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}