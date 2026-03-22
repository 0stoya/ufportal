import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";

const Q = `query { storeConfig { code base_currency_code } }`;

export async function GET() {
  const data = await magentoGraphql<{ storeConfig: { code: string } }>(Q, {}, { requireAuth: false });
  return NextResponse.json(data);
}
