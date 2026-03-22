import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUERY_CUSTOMER_ORDER_DETAIL = /* GraphQL */ `
  query CustomerOrderDetail($number: String!) {
    customer {
      orders(filter: { number: { eq: $number } }) {
        items {
          id
          number
          increment_id
          created_at
          order_date
          status
          shipping_method
          payment_methods { name }
          tr_delivery { date time_from time_to comment }

          total {
            grand_total { value currency }
            subtotal { value currency }
            total_tax { value currency }
            total_shipping { value currency }
            discounts {
              label
              amount { value currency }
            }
          }

          items {
            id
            product_name
            product_sku
            quantity_ordered
            prices {
              price { value currency }
              price_including_tax { value currency }
              row_total { value currency }
              row_total_including_tax { value currency }
              total_item_discount { value currency }
            }
          }
        }
      }
    }
  }
`;

const QUERY_PRODUCTS_BY_SKUS_FOR_UNITS = /* GraphQL */ `
  query ProductsBySkusForUnits($skus: [String!]!) {
    products(filter: { sku: { in: $skus } }, pageSize: 200) {
      items {
        sku
        custom_attributes {
          attribute_metadata { code label }
          entered_attribute_value { value }
        }
      }
    }
  }
`;

type Money = { value: number; currency: string };

type OrderItem = {
  id: string;
  product_name: string;
  product_sku: string;
  quantity_ordered: number;
  prices?: {
    price?: Money;
    price_including_tax?: Money;
    row_total?: Money;
    row_total_including_tax?: Money;
    total_item_discount?: Money;
  } | null;
};

type OrderDetail = {
  id: string;
  number: string;
  increment_id?: string | null;
  created_at?: string | null;
  order_date?: string | null;
  status?: string | null;
  shipping_method?: string | null;
  payment_methods?: Array<{ name?: string | null }> | null;
  tr_delivery?: {
    date?: string | null;
    time_from?: string | null;
    time_to?: string | null;
    comment?: string | null;
  } | null;
  total?: {
    grand_total?: Money | null;
    subtotal?: Money | null;
    total_tax?: Money | null;
    total_shipping?: Money | null;
    discounts?: Array<{ label?: string | null; amount?: Money | null }> | null;
  } | null;
  items: OrderItem[];
};

type OrderResp = {
  customer: {
    orders: {
      items: OrderDetail[];
    };
  };
};

type CustomAttribute = {
  attribute_metadata?: { code?: string | null; label?: string | null } | null;
  entered_attribute_value?: { value?: string | null } | null;
};

type ProductsResp = {
  products: {
    items: Array<
      | {
          sku?: string | null;
          custom_attributes?: CustomAttribute[] | null;
        }
      | null
    >;
  };
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function pickUnitsFromAttrs(attrs: CustomAttribute[] | null | undefined) {
  if (!attrs?.length) return null;
  const found = attrs.find((a) => a.attribute_metadata?.code === "units");
  const v = found?.entered_attribute_value?.value;
  if (!v) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function requireParam(v: unknown, name: string) {
  const s = String(v ?? "").trim();
  if (!s) throw new Error(`Missing route param: ${name}`);
  return s;
}

// ✅ Next 15: params can be async — await them
export async function GET(_req: Request, ctx: { params: Promise<{ number: string }> }) {
  const { number: raw } = await ctx.params;
  const number = requireParam(raw, "number");

  try {
    // 1) Load order detail
    const data = await magentoGraphql<OrderResp>(
      QUERY_CUSTOMER_ORDER_DETAIL,
      { number },
      { requireAuth: true }
    );

    const order = data.customer.orders.items?.[0];
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2) Build SKU list
    const skus = uniq((order.items || []).map((i) => i.product_sku).filter(Boolean));
    let unitsBySku: Record<string, string> = {};

    // 3) Fetch units by SKU (best-effort)
    if (skus.length) {
      try {
        const prodData = await magentoGraphql<ProductsResp>(
          QUERY_PRODUCTS_BY_SKUS_FOR_UNITS,
          { skus },
          { requireAuth: true }
        );

        const items = prodData.products.items || [];
        for (const p of items) {
          if (!p?.sku) continue;
          const units = pickUnitsFromAttrs(p.custom_attributes);
          if (units) unitsBySku[p.sku] = units;
        }
      } catch {
        unitsBySku = {};
      }
    }

    return NextResponse.json({ ...order, unitsBySku });
  } catch (e: any) {
    const msg = e?.message ?? "Failed to load order";
    const isAuth = /401|unauthorized|not authenticated/i.test(msg);
    return NextResponse.json(
      { error: isAuth ? "Unauthorized" : msg },
      { status: isAuth ? 401 : 500 }
    );
  }
}
