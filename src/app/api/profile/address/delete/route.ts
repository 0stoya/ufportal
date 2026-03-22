import { NextResponse } from "next/server";
import { magentoGraphql, MagentoUnauthorizedError } from "@/lib/magento/fetchGraphql";
import { MUTATION_DELETE_ADDRESS } from "@/lib/magento/queries";
import { clearCustomerToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: number } | null;
  const id = Number(body?.id);

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid address id." }, { status: 400 });
  }

  try {
    await magentoGraphql(MUTATION_DELETE_ADDRESS, { id }, { requireAuth: true });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    if (e instanceof MagentoUnauthorizedError) {
      await clearCustomerToken();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: e?.message ?? "Delete address failed" }, { status: 400 });
  }
}
