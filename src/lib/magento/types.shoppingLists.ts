export type ShoppingListItem = {
  item_id: number;
  sku: string;
  qty: number;
  product?: {
    id: number;
    sku: string;
    name: string;
    small_image?: { url?: string | null } | null;
    resolved_price?: {
      custom?: { value_incl_tax: number; value_excl_tax: number; currency: string } | null;
      standard: { value_incl_tax: number; value_excl_tax: number; currency: string };
    };
  } | null;
};

export type ShoppingListItems = {
  items: ShoppingListItem[];
  total_count: number;
};

export type ShoppingList = {
  list_id: number;
  list_name: string;
  items_count: number;
};
