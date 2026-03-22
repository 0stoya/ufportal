import { NextResponse } from "next/server";
import { clearCustomerToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Clear auth cookies (Magento / portal token)
  await clearCustomerToken();

  // Return JSON and clear extra cookies
  const res = NextResponse.json({ ok: true });

  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  // Clear cart cookies if used
  res.cookies.set("cart_id", "", { path: "/", expires: new Date(0) });
  res.cookies.set("magento_cart_id", "", { path: "/", expires: new Date(0) });

  return res;
}
