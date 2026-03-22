import { getToken } from "./cookies";

const STORE = process.env.M2_STORE_CODE ?? "default";

type MagentoGraphqlOpts = {
  requireAuth?: boolean;
};

export class MagentoUnauthorizedError extends Error {
  name = "MagentoUnauthorizedError";
}

export type MagentoGraphqlErrorItem = {
  message: string;
  extensions?: Record<string, unknown>;
  path?: Array<string | number>;
};

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

export async function magentoGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  opts: MagentoGraphqlOpts = {}
): Promise<T> {
  const token = await getToken();

  if (opts.requireAuth && !token) {
    throw new MagentoUnauthorizedError("Not authenticated (missing Magento token cookie).");
  }

  const res = await fetch(process.env.MAGENTO_GRAPHQL_URL as string, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Store: STORE,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new MagentoUnauthorizedError("Magento GraphQL HTTP 401 (token missing/invalid).");
  }

  const json = (await res.json()) as { data?: T; errors?: MagentoGraphqlErrorItem[] };

  if (json.errors?.length) {
    const message = json.errors.map((e) => e.message).join(" | ");
    if (looksUnauthorized(message)) throw new MagentoUnauthorizedError(message);
    throw new MagentoGraphqlError(message, json.errors);
  }

  if (!json.data) throw new Error("Magento GraphQL returned no data.");
  return json.data;
}
