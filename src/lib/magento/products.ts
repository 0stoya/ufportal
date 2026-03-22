import "server-only";
import { magentoGraphql } from "@/lib/magento/fetchGraphql";
import type { CustomAttribute } from "@/lib/magento/types"; // adjust to your actual path
export type ResolvedPrice = {
  custom?: { value_incl_tax: number; value_excl_tax: number; currency: string } | null;
  standard: { value_incl_tax: number; value_excl_tax: number; currency: string };
};

export type ProductPdp = {
  __typename?: string;
  id: number;
  sku: string;
  name: string;
  small_image?: { url?: string | null } | null;
  resolved_price?: ResolvedPrice | null;
  custom_attributes?: CustomAttribute[] | null;
};

const QUERY_PRODUCTS_BY_SKU_EQ = /* GraphQL */ `
  query ProductsBySkuEq($sku: String!, $pageSize: Int = 1) {
    products(filter: { sku: { eq: $sku } }, pageSize: $pageSize, currentPage: 1) {
      items {
        __typename
        id
        sku
        name
        units
        bbe
        d1ford3
        small_image { url }
        custom_attributes {
  attribute_metadata { code label }
  entered_attribute_value { value }
  selected_attribute_options {
    attribute_option { uid label }
  }
}
        resolved_price {
          custom { value_incl_tax value_excl_tax currency }
          standard { value_incl_tax value_excl_tax currency }
        }
      }
      total_count
    }
  }
`;

export async function getProductBySku(sku: string): Promise<ProductPdp | null> {
  const data = await magentoGraphql<{
    products: { items: ProductPdp[]; total_count: number };
  }>(QUERY_PRODUCTS_BY_SKU_EQ, { sku, pageSize: 1 }, { requireAuth: false });

  return data.products.items?.[0] ?? null;
}
