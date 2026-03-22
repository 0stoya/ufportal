import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { clearCustomerToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPDATE_CUSTOMER = /* GraphQL */ `
  mutation UpdateCustomer($input: CustomerUpdateInput!) {
    updateCustomerV2(input: $input) {
      customer {
        firstname
        lastname
        email
        date_of_birth
        gender
      }
    }
  }
`;


export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { firstname?: string; lastname?: string; date_of_birth?: string | null; gender?: number | null }
    | null;

  const firstname = String(body?.firstname ?? "").trim();
  const lastname = String(body?.lastname ?? "").trim();
  const date_of_birth = body?.date_of_birth ?? null;
  const gender = body?.gender ?? null;

  if (!firstname || !lastname) {
    return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });
  }

  try {
    await magentoGraphql(
      UPDATE_CUSTOMER,
      {
        input: {
          firstname,
          lastname,
          date_of_birth: date_of_birth || null,
          gender
        }
      },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    if (e instanceof MagentoUnauthorizedError) {
      await clearCustomerToken();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(
      { error: e?.message ?? "Update failed" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
