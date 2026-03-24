// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { QUERY_ME } from "@/lib/magento/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  type Resp = {
    customer: { firstname: string; lastname: string; email: string };
    customerCart: { id: string; total_quantity: number };
  };

  try {
    const data = await magentoGraphql<Resp>(QUERY_ME, {}, { requireAuth: true });
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (e: unknown) {
    if (e instanceof MagentoUnauthorizedError) {
      // Do not clear the auth cookie here.
      // Some browsers/PWA contexts can surface transient unauthorized responses
      // during startup; immediately deleting a valid long-lived cookie causes users
      // to appear logged out after closing/reopening the app.
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
