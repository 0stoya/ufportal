import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  CUSTOMER_TOKEN_COOKIE_NAME,
} from "@/lib/auth/cookies";
import { magentoFetch } from "@/lib/magento/client";

const GENERATE_CUSTOMER_TOKEN = /* GraphQL */ `
  mutation GenerateCustomerToken($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) {
      token
    }
  }
`;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;

  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Missing credentials" }, { status: 400 });
  }

  try {
    const data = await magentoFetch<{ generateCustomerToken: { token: string } }>(
      GENERATE_CUSTOMER_TOKEN,
      { email, password },
      null // no bearer needed to login
    );

    const res = NextResponse.json({ ok: true });

    // Set cookie on the response directly so persistence works reliably
    // across browser + standalone PWA contexts.
    res.cookies.set(CUSTOMER_TOKEN_COOKIE_NAME, data.generateCustomerToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.AUTH_COOKIE_DOMAIN || undefined
          : undefined,
      maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
      expires: new Date(Date.now() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000),
    });

    return res;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid login" }, { status: 401 });
  }
}
