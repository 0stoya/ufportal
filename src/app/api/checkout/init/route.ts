import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import {
  QUERY_CUSTOMER_ADDRESSES,
  QUERY_CHECKOUT_CART_SUMMARY,
  QUERY_TR_DELIVERY_DATE,
} from "@/lib/magento/queries";
import type {
  CheckoutInit,
  CustomerAddress,
  TrDeliveryDateInfo,
} from "@/lib/magento/types.checkout";

type CustomerAddressesResp = {
  customer: { addresses: CustomerAddress[] };
};

type CartSummaryResp = {
  customerCart: {
    id: string;
    total_quantity: number | null;
    prices: { grand_total: { value: number; currency: string } | null } | null;
  };
};

type TrDeliveryResp = { trDeliveryDate: TrDeliveryDateInfo };

export async function GET() {
  try {
    const [cartRes, addrRes] = await Promise.all([
      magentoGraphql<CartSummaryResp>(QUERY_CHECKOUT_CART_SUMMARY, {}, { requireAuth: true }),
      magentoGraphql<CustomerAddressesResp>(QUERY_CUSTOMER_ADDRESSES, {}, { requireAuth: true }),
    ]);

    const cartId = cartRes.customerCart.id;

    let delivery: TrDeliveryDateInfo | null = null;
    try {
      const d = await magentoGraphql<TrDeliveryResp>(
        QUERY_TR_DELIVERY_DATE,
        { cartId },
        { requireAuth: true }
      );
      delivery = d.trDeliveryDate;
    } catch {
      // delivery module might require shipping address first; UI will handle it
      delivery = null;
    }

    const payload: CheckoutInit = {
      cart: {
        id: cartId,
        total_quantity: cartRes.customerCart.total_quantity,
        grand_total: cartRes.customerCart.prices?.grand_total ?? null,
      },
      addresses: addrRes.customer.addresses ?? [],
      delivery,
    };

    return NextResponse.json(payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to init checkout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
