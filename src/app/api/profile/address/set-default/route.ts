import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { QUERY_CUSTOMER_ADDRESSES, MUTATION_UPDATE_ADDRESS } from "@/lib/magento/queries";
import { clearCustomerToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind = "shipping" | "billing";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: number; kind?: Kind } | null;
  const id = Number(body?.id);
  const kind = body?.kind;

  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Invalid address id." }, { status: 400 });
  if (kind !== "shipping" && kind !== "billing") {
    return NextResponse.json({ error: "Invalid kind (shipping|billing)." }, { status: 400 });
  }

  try {
    const data = await magentoGraphql<{ customer: { addresses: any[] } }>(
      QUERY_CUSTOMER_ADDRESSES,
      {},
      { requireAuth: true }
    );

    const addresses = data.customer?.addresses ?? [];
    const target = addresses.find((a) => Number(a.id) === id);
    if (!target) return NextResponse.json({ error: "Address not found." }, { status: 404 });

    const prevDefault = addresses.find((a) =>
      kind === "shipping" ? !!a.default_shipping : !!a.default_billing
    );

    // Helper: rebuild input from existing address (Magento expects full input)
    const toInput = (a: any, patch: Record<string, any>) => ({
      firstname: a.firstname,
      lastname: a.lastname,
      street: a.street,
      city: a.city,
      postcode: a.postcode,
      country_code: a.country_code,
      telephone: a.telephone ?? null,
      region: a.region?.region ? { region: a.region.region } : null,
      default_shipping: !!a.default_shipping,
      default_billing: !!a.default_billing,
      ...patch,
    });

    // 1) unset previous default (if different)
    if (prevDefault && Number(prevDefault.id) !== id) {
      await magentoGraphql(
        MUTATION_UPDATE_ADDRESS,
        {
          id: Number(prevDefault.id),
          input: toInput(prevDefault, {
            ...(kind === "shipping" ? { default_shipping: false } : { default_billing: false }),
          }),
        },
        { requireAuth: true }
      );
    }

    // 2) set new default
    await magentoGraphql(
      MUTATION_UPDATE_ADDRESS,
      {
        id,
        input: toInput(target, {
          ...(kind === "shipping" ? { default_shipping: true } : { default_billing: true }),
        }),
      },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    if (e instanceof MagentoUnauthorizedError) {
      await clearCustomerToken();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: e?.message ?? "Set default failed" }, { status: 400 });
  }
}
