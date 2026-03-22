import { cookies } from "next/headers";

export const CUSTOMER_TOKEN_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ufportal_m2_token";

// IMPORTANT: only set domain in production AND only if you really need cross-subdomain sharing.
// For localhost, leave undefined.
const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production" ? process.env.AUTH_COOKIE_DOMAIN || undefined : undefined;
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function baseCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: COOKIE_DOMAIN,
  };
}

export async function getCustomerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CUSTOMER_TOKEN_COOKIE_NAME)?.value ?? null;
}

export async function setCustomerToken(token: string): Promise<void> {
  const store = await cookies();

  store.set(CUSTOMER_TOKEN_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    // Set both maxAge and absolute expires to maximize persistence across
    // browser/PWA implementations when windows are closed/reopened.
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    expires: new Date(Date.now() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000),
  });
}

export async function clearCustomerToken(): Promise<void> {
  const store = await cookies();

  store.set(CUSTOMER_TOKEN_COOKIE_NAME, "", {
    ...baseCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}
