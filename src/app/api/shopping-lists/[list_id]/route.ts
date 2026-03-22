import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_SHOPPING_LIST_BY_ID, MUTATION_UPDATE_SHOPPING_LIST, MUTATION_DELETE_SHOPPING_LIST } from "@/lib/magento/queries";
import type { ShoppingList } from "@/lib/magento/types.shoppingLists";

type ListResp = {
  shoppingListById: ShoppingList & {
    items: { total_count: number; items: Array<any> }; // typed in UI file
  };
};

type UpdateResp = { updateShoppingList: ShoppingList };
type DeleteResp = { deleteShoppingList: boolean };

export async function GET(req: Request, ctx: { params: Promise<{ list_id: string }> }) {
  const { list_id } = await ctx.params;
  const listId = Number(list_id);
  if (!Number.isFinite(listId) || listId <= 0) return NextResponse.json({ error: "list_id is required" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  try {
    const data = await magentoGraphql<ListResp>(
      QUERY_SHOPPING_LIST_BY_ID,
      { listId, pageSize, currentPage },
      { requireAuth: true }
    );
    return NextResponse.json(data.shoppingListById);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load list";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ list_id: string }> }) {
  const { list_id } = await ctx.params;
  const listId = Number(list_id);

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = (body?.name ?? "").trim();

  if (!Number.isFinite(listId) || listId <= 0) return NextResponse.json({ error: "list_id is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  try {
    const data = await magentoGraphql<UpdateResp>(MUTATION_UPDATE_SHOPPING_LIST, { listId, name }, { requireAuth: true });
    return NextResponse.json({ item: data.updateShoppingList });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update list";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ list_id: string }> }) {
  const { list_id } = await ctx.params;
  const listId = Number(list_id);

  if (!Number.isFinite(listId) || listId <= 0) return NextResponse.json({ error: "list_id is required" }, { status: 400 });

  try {
    const data = await magentoGraphql<DeleteResp>(MUTATION_DELETE_SHOPPING_LIST, { listId }, { requireAuth: true });
    return NextResponse.json({ ok: data.deleteShoppingList });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to delete list";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
