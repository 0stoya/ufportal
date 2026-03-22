import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_CUSTOMER_ORDERS } from "@/lib/magento/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const currentPage = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || "20")));

  type Resp = {
    customer: {
      orders: {
        total_count: number;
        page_info: { current_page: number; page_size: number; total_pages: number };
        items: Array<{
          id: string | number;
          increment_id: string;
          order_date: string;
          status: string;
          shipping_method: string | null;
          payment_methods?: Array<{ name: string }> | null;
          total: { grand_total: { value: number; currency: string } };
        }>;
      };
    };
  };

  try {
    const data = await magentoGraphql<Resp>(
      QUERY_CUSTOMER_ORDERS,
      { pageSize, currentPage },
      { requireAuth: true }
    );

    return NextResponse.json(data.customer.orders);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load orders" }, { status: 500 });
  }
}
