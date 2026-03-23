import { NextResponse } from "next/server";
import { CUSTOMER_TOKEN_COOKIE_NAME } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const redirectUrl = new URL("/login", request.url);
  const res = NextResponse.redirect(redirectUrl, { status: 303 });

  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  res.cookies.set(CUSTOMER_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain:
      process.env.NODE_ENV === "production" ? process.env.AUTH_COOKIE_DOMAIN || undefined : undefined,
    maxAge: 0,
    expires: new Date(0),
  });

  // Clear cart cookies if used
  res.cookies.set("cart_id", "", { path: "/", expires: new Date(0) });
  res.cookies.set("magento_cart_id", "", { path: "/", expires: new Date(0) });

  return res;
}
