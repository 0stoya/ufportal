import { NextResponse } from "next/server";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use Magento's reorder mutation (GraphQL)
const MUTATION_REORDER = /* GraphQL */ `
  mutation ReorderItems($orderNumber: String!) {
    reorderItems(orderNumber: $orderNumber) {
      cart {
        id
        total_quantity
      }
      userInputErrors {
        code
        message
        path
      }
    }
  }
`;

function getQueryParam(req: Request, key: string) {
  const url = new URL(req.url);
  const v = (url.searchParams.get(key) ?? "").trim();
  return v || null;
}

function toStr(v: unknown) {
  return String(v ?? "").trim();
}

function pickError(e: any) {
  return toStr(e?.message) || "Reorder failed";
}

// Optional: keep GET for manual testing: /api/orders/reorder?increment_id=...
export async function GET(req: Request) {
  const incrementId = getQueryParam(req, "increment_id");
  if (!incrementId) {
    return NextResponse.json({ error: "increment_id is required" }, { status: 400 });
  }
  // For safety, do NOT reorder via GET. Just report OK.
  return NextResponse.json({ ok: true, increment_id: incrementId });
}

// ✅ Your UI calls POST with JSON body: { increment_id }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const increment_id = toStr(body?.increment_id);

    if (!increment_id) {
      return NextResponse.json({ error: "increment_id is required" }, { status: 400 });
    }

    const data = await magentoGraphql<any>(
      MUTATION_REORDER,
      { orderNumber: increment_id },
      { requireAuth: true }
    );

    const payload = data?.reorderItems;
    const errors = payload?.userInputErrors ?? [];
    if (errors.length) {
      const msg = errors.map((e: any) => e?.message).filter(Boolean).join(" | ") || "Reorder failed";
      return NextResponse.json({ error: msg, userInputErrors: errors }, { status: 400 });
    }

    // Return something your UI can use
    return NextResponse.json({
      added: [], // unknown count via this mutation; keep for UI compatibility
      cart: payload?.cart ?? null,
    });
  } catch (e: any) {
    const msg = pickError(e);
    const isAuth = /401|unauthorized|not authenticated/i.test(msg);
    return NextResponse.json(
      { error: isAuth ? "Unauthorized" : msg },
      { status: isAuth ? 401 : 500 }
    );
  }
}
