import { cookies } from "next/headers";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ufportal_m2_token";

// IMPORTANT: only set domain in production AND only if you really need cross-subdomain sharing.
// For localhost, leave undefined.
const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production" ? process.env.AUTH_COOKIE_DOMAIN || undefined : undefined;

export async function getCustomerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setCustomerToken(token: string): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: COOKIE_DOMAIN,

    // Suggested: 14 days to reduce “random” logouts
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearCustomerToken(): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: 0,
  });
}
