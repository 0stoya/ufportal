import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import { MUTATION_PORTAL_PUSH_UNSUBSCRIBE } from "@/lib/magento/graphql/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { endpoint: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const endpoint = String(body?.endpoint || "").trim();
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const data = await magentoGraphql(
      MUTATION_PORTAL_PUSH_UNSUBSCRIBE,
      { endpoint },
      { requireAuth: true }
    );

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unsubscribe failed" }, { status: 500 });
  }
}
