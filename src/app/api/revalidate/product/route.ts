// src/app/api/revalidate/product/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sku = typeof body?.sku === "string" ? body.sku.trim() : "";

  if (sku) {
    revalidateTag(`product:${sku}`);
  } else {
    // fallback: invalidate the entire catalog cache
    revalidateTag("products");
  }

  return NextResponse.json({ ok: true });
}
