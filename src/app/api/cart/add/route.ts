import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { MUTATION_ADD_SIMPLE_TO_CART, QUERY_CART_ID } from "@/lib/magento/queries";
import type { Cart } from "@/lib/magento/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartIdResp = { customerCart: { id: string } };
type AddResp = { addSimpleProductsToCart: { cart: Cart } };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sku = (body?.sku || "").trim();
  const qty = Number(body?.qty ?? 1);

  if (!sku || !Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: "sku and positive qty are required" }, { status: 400 });
  }

  try {
    const cart = await magentoGraphql<CartIdResp>(QUERY_CART_ID, {}, { requireAuth: true });
    const cartId = cart.customerCart.id;

    const added = await magentoGraphql<AddResp>(
      MUTATION_ADD_SIMPLE_TO_CART,
      { cartId, sku, qty },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true, cart: added.addSimpleProductsToCart.cart });
  } catch (e: any) {
    const msg = e?.message ?? "Add to cart failed";
    const isAuth = /401|unauthorized|not authenticated/i.test(msg);
    return NextResponse.json({ error: isAuth ? "Unauthorized" : msg }, { status: isAuth ? 401 : 500 });
  }
}
