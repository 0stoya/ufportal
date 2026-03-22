import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { MUTATION_CREATE_ADDRESS } from "@/lib/magento/queries";
import { clearCustomerToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  firstname: string;
  lastname: string;
  street1: string;
  street2?: string;
  city: string;
  postcode: string;
  country_code: string; // e.g. "GB"
  telephone?: string;
  region?: string;
  default_shipping?: boolean;
  default_billing?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const firstname = String(body.firstname ?? "").trim();
  const lastname = String(body.lastname ?? "").trim();
  const street1 = String(body.street1 ?? "").trim();
  const street2 = String(body.street2 ?? "").trim();
  const city = String(body.city ?? "").trim();
  const postcode = String(body.postcode ?? "").trim();
  const country_code = String(body.country_code ?? "").trim().toUpperCase();
  const telephone = String(body.telephone ?? "").trim();
  const region = String(body.region ?? "").trim();

  if (!firstname || !lastname || !street1 || !city || !postcode || !country_code) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const street = [street1, street2].filter(Boolean);

  try {
    await magentoGraphql(
      MUTATION_CREATE_ADDRESS,
      {
        input: {
          firstname,
          lastname,
          street,
          city,
          postcode,
          country_code,
          telephone: telephone || null,
          region: region ? { region } : null,
          default_shipping: !!body.default_shipping,
          default_billing: !!body.default_billing,
        },
      },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    if (e instanceof MagentoUnauthorizedError) {
      await clearCustomerToken();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: e?.message ?? "Create address failed" }, { status: 400 });
  }
}
