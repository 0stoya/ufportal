import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_CART, MUTATION_UPDATE_CART_ITEMS } from "@/lib/magento/queries";
import type { Cart } from "@/lib/magento/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartResp = { customerCart: Cart };
type UpdateResp = { updateCartItems: { cart: Cart } };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { cart_item_id?: number; quantity?: number }
    | null;

  const cartItemId = Number(body?.cart_item_id);
  const quantity = Number(body?.quantity);

  if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
    return NextResponse.json({ error: "cart_item_id is required" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be > 0" }, { status: 400 });
  }

  try {
    const cart = await magentoGraphql<CartResp>(QUERY_CART, {}, { requireAuth: true });
    const cartId = cart.customerCart.id;

    const updated = await magentoGraphql<UpdateResp>(
      MUTATION_UPDATE_CART_ITEMS,
      { cartId, cartItemId, quantity },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true, cart: updated.updateCartItems.cart });
  } catch (e: any) {
    const msg = e?.message ?? "Failed to update cart";
    const isAuth = /401|unauthorized|not authenticated/i.test(msg);
    return NextResponse.json({ error: isAuth ? "Unauthorized" : msg }, { status: isAuth ? 401 : 500 });
  }
}
