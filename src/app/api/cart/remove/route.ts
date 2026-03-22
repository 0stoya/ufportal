import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { MUTATION_REMOVE_ITEM_FROM_CART, QUERY_CART_ID } from "@/lib/magento/queries";
import type { Cart } from "@/lib/magento/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartIdResp = { customerCart: { id: string } };
type RemoveResp = { removeItemFromCart: { cart: Cart } };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { cart_item_id?: number } | null;
  const cartItemId = Number(body?.cart_item_id);

  if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
    return NextResponse.json({ error: "cart_item_id is required" }, { status: 400 });
  }

  try {
    const cart = await magentoGraphql<CartIdResp>(QUERY_CART_ID, {}, { requireAuth: true });
    const cartId = cart.customerCart.id;

    const updated = await magentoGraphql<RemoveResp>(
      MUTATION_REMOVE_ITEM_FROM_CART,
      { cartId, cartItemId },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true, cart: updated.removeItemFromCart.cart });
  } catch (e: any) {
    const msg = e?.message ?? "Failed to remove item";
    const isAuth = /401|unauthorized|not authenticated/i.test(msg);
    return NextResponse.json({ error: isAuth ? "Unauthorized" : msg }, { status: isAuth ? 401 : 500 });
  }
}
