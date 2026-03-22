import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { QUERY_PORTAL_PUSH_ME } from "@/lib/magento/graphql/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await magentoGraphql(QUERY_PORTAL_PUSH_ME, {}, { requireAuth: true });
    const items = (data as any)?.portalPushMe ?? [];
    return NextResponse.json({ ok: true, enabled: Array.isArray(items) && items.length > 0 });
  } catch (e: any) {
    // If not logged in, report disabled rather than erroring the UI
    return NextResponse.json({ ok: false, enabled: false, error: e?.message || "Status failed" });
  }
}
