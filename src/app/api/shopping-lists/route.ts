import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_CUSTOMER_SHOPPING_LISTS, MUTATION_CREATE_SHOPPING_LIST } from "@/lib/magento/queries";
import type { ShoppingList } from "@/lib/magento/types.shoppingLists";

type ListsResp = { customerShoppingLists: ShoppingList[] };
type CreateResp = { createShoppingList: ShoppingList };

export async function GET() {
  try {
    const data = await magentoGraphql<ListsResp>(QUERY_CUSTOMER_SHOPPING_LISTS, {}, { requireAuth: true });
    return NextResponse.json({ items: data.customerShoppingLists ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load lists";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = (body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  try {
    const data = await magentoGraphql<CreateResp>(MUTATION_CREATE_SHOPPING_LIST, { name }, { requireAuth: true });
    return NextResponse.json({ item: data.createShoppingList });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create list";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
