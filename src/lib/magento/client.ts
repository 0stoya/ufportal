import { getCustomerToken } from "@/lib/auth/cookies";

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function magentoFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  bearerToken: string | null
): Promise<T> {
  const url = process.env.MAGENTO_GRAPHQL_URL;
  if (!url) throw new Error("MAGENTO_GRAPHQL_URL is not set");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new Error("Magento GraphQL HTTP 401 (token missing/invalid).");
  }

  const json = (await res.json()) as GraphqlResponse<T>;

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(" | "));
  }

  if (!json.data) throw new Error("Magento GraphQL returned no data.");
  return json.data;
}

export async function magentoGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  opts?: { requireAuth?: boolean }
): Promise<T> {
  const token = await getCustomerToken();

  if (opts?.requireAuth && !token) {
    throw new Error("Not authenticated.");
  }

  return magentoFetch<T>(query, variables, token);
}
