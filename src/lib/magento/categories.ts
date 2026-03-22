// src/lib/magento/categories.ts
import { magentoGraphql } from "@/lib/magento/fetchGraphql";

export type NavCategory = {
  id: number;
  name: string;
  url_path: string;
  children: NavCategory[];
};

const QUERY_STORE_ROOT_CATEGORY = /* GraphQL */ `
  query StoreRootCategory {
    storeConfig {
      root_category_id
    }
  }
`;

// Depth 3 (top -> level2 -> level3). We can extend later if needed.
const QUERY_CATEGORY_TREE_DEPTH_3 = /* GraphQL */ `
  query CategoryTree($id: Int!) {
    category(id: $id) {
      id
      name
      url_path
      children {
        id
        name
        url_path
        children {
          id
          name
          url_path
          children {
            id
            name
            url_path
          }
        }
      }
    }
  }
`;

type StoreRootResp = {
  storeConfig?: { root_category_id?: number | null } | null;
};

type CategoryNode = {
  id: number;
  name?: string | null;
  url_path?: string | null;
  children?: CategoryNode[] | null;
};

type CategoryTreeResp = { category?: CategoryNode | null };

function normalize(node: CategoryNode | null | undefined): NavCategory | null {
  if (!node?.id) return null;

  const children = (node.children ?? [])
    .map(normalize)
    .filter((x): x is NavCategory => Boolean(x));

  return {
    id: node.id,
    name: (node.name ?? "").trim() || `Category ${node.id}`,
    url_path: (node.url_path ?? "").trim(),
    children,
  };
}

/**
 * Returns top-level categories (root.children) ready for menu.
 * Cached server-side (guest-safe).
 */
export async function getNavCategories(): Promise<NavCategory[]> {
  const store = await magentoGraphql<StoreRootResp>(QUERY_STORE_ROOT_CATEGORY, {}, {
    cache: "force-cache",
    next: { revalidate: 60 * 60, tags: ["categories"] },
  });

  const rootId = store?.storeConfig?.root_category_id;
  if (!rootId) return [];

  const tree = await magentoGraphql<CategoryTreeResp>(QUERY_CATEGORY_TREE_DEPTH_3, { id: rootId }, {
    cache: "force-cache",
    next: { revalidate: 60 * 60, tags: ["categories"] },
  });

  const root = normalize(tree?.category);
  return root?.children ?? [];
}

/**
 * UFPortal category URL builder (starter).
 * We’ll use /c/<url_path> and create the route below to avoid 404s.
 */
export function categoryHref(url_path: string) {
  const p = (url_path || "").replace(/^\/+|\/+$/g, "");
  return p ? `/c/${p}` : "/c";
}
