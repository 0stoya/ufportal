import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListsCountQuery = {
  customerShoppingLists: Array<{
    list_id: number;
    items_count: number | null;
  }>;
};

const QUERY = /* GraphQL */ `
  query ListsCount {
    customerShoppingLists {
      list_id
      items_count
    }
  }
`;

export async function GET() {
  try {
    const data = await magentoGraphql<ListsCountQuery>(
      QUERY,
      {},
      { requireAuth: true }
    );

    const maxCount =
      data.customerShoppingLists?.reduce((max, list) => {
        const n = Number(list.items_count ?? 0);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) ?? 0;

    return NextResponse.json({ count: maxCount });
  } catch {
    // Not logged in / token expired / safe fallback
    return NextResponse.json({ count: 0 });
  }
}
