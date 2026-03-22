import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";

const Q = /* GraphQL */ `
  query Bootstrap {
    customer {
      firstname
      lastname
      email
    }
    trAccordRestrictions {
      accord_code
      restricted_skus
      total_count
    }
  }
`;

type Resp = {
  customer: { firstname: string; lastname: string; email: string };
  trAccordRestrictions: { accord_code: string | null; restricted_skus: string[]; total_count: number };
};

export async function GET() {
  try {
    const data = await magentoGraphql<Resp>(Q, {}, { requireAuth: true });
    return NextResponse.json({
      customer: data.customer,
      restrictions: data.trAccordRestrictions,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
