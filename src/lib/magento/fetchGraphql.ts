// src/lib/magento/fetchGraphql.ts
import "server-only";
import { getCustomerToken } from "@/lib/auth/cookies";

const STORE = process.env.M2_STORE_CODE ?? "default";
const ENDPOINT = process.env.MAGENTO_GRAPHQL_URL as string;
const INTERNAL_HOST = process.env.MAGENTO_INTERNAL_HOST; // e.g. "www.demo.thomasridley.co.uk"

export type MagentoGraphqlOpts = {
  /**
   * If true, throw immediately when no customer token cookie exists.
   */
  requireAuth?: boolean;

  /**
   * Extra headers to merge into the request.
   * (Useful for custom headers or overriding Store for multi-store setups.)
   */
  headers?: Record<string, string>;

  /**
   * Fetch cache mode.
   * Default:
   *  - token present -> "no-store" (customer-specific)
   *  - no token      -> "force-cache" (guest-safe), override per call if needed
   */
  cache?: RequestCache;

  /**
   * Next.js server fetch options (server-only).
   * Example: { revalidate: 60, tags: ["pdp", "sku:ABC"] }
   */
  next?: { revalidate?: number; tags?: string[] };

  /**
   * Abort timeout in ms (defaults to 15s).
   */
  timeoutMs?: number;
};

export type MagentoGraphqlErrorItem = {
  message: string;
  extensions?: Record<string, unknown>;
  path?: Array<string | number>;
};

export class MagentoUnauthorizedError extends Error {
  name = "MagentoUnauthorizedError";
}

export class MagentoGraphqlError extends Error {
  name = "MagentoGraphqlError";
  errors: MagentoGraphqlErrorItem[];

  constructor(message: string, errors: MagentoGraphqlErrorItem[]) {
    super(message);
    this.errors = errors;
  }
}

function looksUnauthorized(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("not authorized") ||
    m.includes("isn't authorized") ||
    m.includes("not authenticated") ||
    m.includes("current customer") ||
    m.includes("customer is not authorized") ||
    (m.includes("authorization") && m.includes("required"))
  );
}

function snippet(s: string, n = 600) {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function ensureEnv() {
  if (!ENDPOINT) {
    throw new Error("MAGENTO_GRAPHQL_URL is not set.");
  }
}

/**
 * Production Magento GraphQL fetcher:
 * - Uses localhost endpoint for speed
 * - Pins the correct Magento vhost via Host header (MAGENTO_INTERNAL_HOST)
 * - Supports per-call cache/next revalidate/tags
 * - Parses response safely (text first -> JSON)
 * - Normalizes unauthorized errors (401 + GraphQL messages)
 */
export async function magentoGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: MagentoGraphqlOpts = {}
): Promise<T> {
  ensureEnv();

  const token = await getCustomerToken();

  if (opts.requireAuth && !token) {
    throw new MagentoUnauthorizedError("Not authenticated (missing Magento token cookie).");
  }

  const timeoutMs = opts.timeoutMs ?? 15_000;

  // Default caching: only cache when not authenticated.
  const cache: RequestCache = opts.cache ?? (token ? "no-store" : "force-cache");

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let res: Response;
  let text = "";

  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "application/json",
        Store: STORE,

        // Critical: ensure nginx chooses the right Magento instance when calling 127.0.0.1
        ...(INTERNAL_HOST ? { Host: INTERNAL_HOST } : {}),

        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers ?? {}),
      },
      body: JSON.stringify({ query, variables }),
      cache,
      ...(opts.next ? { next: opts.next } : {}),
      signal: ac.signal,
    });

    // Read as text first (Magento can return HTML/plain text on fatal errors)
    text = await res.text();
  } catch (e: any) {
    const msg =
      e?.name === "AbortError"
        ? `Magento GraphQL timed out after ${timeoutMs}ms`
        : `Magento GraphQL request failed: ${e?.message ?? String(e)}`;
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    throw new MagentoUnauthorizedError("Magento GraphQL HTTP 401 (token missing/invalid).");
  }

  let json: { data?: T; errors?: MagentoGraphqlErrorItem[] } | null = null;

  try {
    json = text ? (JSON.parse(text) as any) : null;
  } catch {
    throw new Error(
      `Magento GraphQL returned non-JSON (HTTP ${res.status}). Body: ${snippet(text)}`
    );
  }

  if (json?.errors?.length) {
    const message = json.errors.map((e) => e.message).join(" | ");
    if (looksUnauthorized(message)) throw new MagentoUnauthorizedError(message);
    throw new MagentoGraphqlError(message, json.errors);
  }

  if (!json?.data) {
    throw new Error("Magento GraphQL returned no data.");
  }

  return json.data;
}
