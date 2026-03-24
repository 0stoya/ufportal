import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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
    return NextResponse.json(
      {
        customer: data.customer,
        restrictions: data.trAccordRestrictions,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e: unknown) {
    if (e instanceof MagentoUnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
