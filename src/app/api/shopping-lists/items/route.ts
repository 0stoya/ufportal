import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import {
  MUTATION_UPDATE_SHOPPING_LIST_ITEMS,
  MUTATION_REMOVE_PRODUCT_FROM_SHOPPING_LIST,
  MUTATION_ADD_SHOPPING_LIST_TO_CART,
  MUTATION_ADD_SINGLE_ITEM_TO_CART,
  MUTATION_ADD_SELECTED_ITEMS_TO_CART,
} from "@/lib/magento/queries";

type BoolResp<T extends string> = Record<T, boolean>;

type UpdateBody = { items: Array<{ item_id: number; qty: number }> };
type RemoveBody = { item_id: number };
type AddListBody = { list_id: number };
type AddSingleBody = { item_id: number; qty: number };
type AddSelectedBody = { items: Array<{ item_id: number; qty: number }> };

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as UpdateBody | null;
  const items = body?.items ?? [];
  if (!items.length) return NextResponse.json({ error: "items are required" }, { status: 400 });

  try {
    const data = await magentoGraphql<BoolResp<"updateShoppingListItems">>(
      MUTATION_UPDATE_SHOPPING_LIST_ITEMS,
      { items },
      { requireAuth: true }
    );
    return NextResponse.json({ ok: data.updateShoppingListItems });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update items";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | ({ action: "remove" } & RemoveBody)
    | ({ action: "addListToCart" } & AddListBody)
    | ({ action: "addSingleToCart" } & AddSingleBody)
    | ({ action: "addSelectedToCart" } & AddSelectedBody)
    | null;

  if (!body?.action) return NextResponse.json({ error: "action is required" }, { status: 400 });

  try {
    if (body.action === "remove") {
      const data = await magentoGraphql<BoolResp<"removeProductFromShoppingList">>(
        MUTATION_REMOVE_PRODUCT_FROM_SHOPPING_LIST,
        { itemId: body.item_id },
        { requireAuth: true }
      );
      return NextResponse.json({ ok: data.removeProductFromShoppingList });
    }

    if (body.action === "addListToCart") {
      const data = await magentoGraphql<BoolResp<"addShoppingListToCart">>(
        MUTATION_ADD_SHOPPING_LIST_TO_CART,
        { listId: body.list_id },
        { requireAuth: true }
      );
      return NextResponse.json({ ok: data.addShoppingListToCart });
    }

    if (body.action === "addSingleToCart") {
      const data = await magentoGraphql<BoolResp<"addSingleItemToCart">>(
        MUTATION_ADD_SINGLE_ITEM_TO_CART,
        { itemId: body.item_id, qty: body.qty },
        { requireAuth: true }
      );
      return NextResponse.json({ ok: data.addSingleItemToCart });
    }

    if (body.action === "addSelectedToCart") {
      const data = await magentoGraphql<BoolResp<"addSelectedItemsToCart">>(
        MUTATION_ADD_SELECTED_ITEMS_TO_CART,
        { items: body.items },
        { requireAuth: true }
      );
      return NextResponse.json({ ok: data.addSelectedItemsToCart });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Shopping list action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
