import { magentoGraphql } from "@/lib/magento/fetchGraphql";

// Define the precise type we expect back
type BrandBlockResponse = {
  amBrandGetMoreFromThisBrandBlock: {
    title: string;
    items: Array<{
  id: number;
  sku: string;
  name: string;
  units: string | null;
  small_image?: { url?: string | null };
  resolved_price?: {
    custom?: { value_incl_tax: number; value_excl_tax: number; currency: string } | null;
    standard?: { value_incl_tax: number; value_excl_tax: number; currency: string } | null;
  } | null;
}>;

  } | null;
};

export const GET_MORE_FROM_BRAND = /* GraphQL */ `
 query GetMoreFromBrand($productId: Int!) {
  amBrandGetMoreFromThisBrandBlock(productId: $productId) {
    title
    items {
      id
      sku
      name
      units
      small_image { url }
      resolved_price {
        custom { value_incl_tax value_excl_tax currency }
        standard { value_incl_tax value_excl_tax currency }
      }
    }
  }
}

`;

export async function getMoreFromBrand(productId: number) {
  try {
    const data = await magentoGraphql<BrandBlockResponse>(
      GET_MORE_FROM_BRAND,
      { productId },
      { requireAuth: false }
    );

    return data.amBrandGetMoreFromThisBrandBlock;
  } catch (error) {
    console.error("Failed to fetch 'More from Brand':", error);
    return null;
  }
}