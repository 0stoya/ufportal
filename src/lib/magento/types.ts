// --- MONEY & SHARED ---

export type Money = {
  value: number;
  currency: string;
};

// --- ORDER TYPES ---

export type OrderListItem = {
  id: string; // GraphQL 'ID' is usually string
  increment_id: string;
  created_at: string; // ✅ Added this (The 2026 date)
  order_date: string; // (The 2023 date)
  status: string;
  shipping_method: string | null;
  payment_methods: Array<{ name: string }>;
  total: { grand_total: Money };
  tr_delivery?: TrDeliveryDate | null; // ✅ add
};

export type CustomerOrders = {
  customer: {
    orders: {
      total_count: number;
      page_info: { current_page: number; page_size: number; total_pages: number };
      items: OrderListItem[];
    };
  };
};

export type OrderItem = {
  id: string;
  product_name: string;
  product_sku: string;
  quantity_ordered: number;
  prices?: {
    price?: Money;
    price_including_tax?: Money;
    row_total?: Money;
    row_total_including_tax?: Money;
    total_item_discount?: Money;
  };
};


export type OrderDetail = {
  id: string;
  number: string; 
  increment_id?: string; 
  created_at?: string; 
  order_date: string;
  status: string;
  shipping_method: string | null;
  payment_methods: Array<{ name: string }>;
  items: OrderItem[];
  tr_delivery?: TrDeliveryDate | null; 
total: { 
    grand_total: Money; 
    subtotal?: Money;  // Make optional just in case
    total_tax?: Money; // Make optional just in case
  
}
};

export type CartPrices = {
  grand_total: Money;
  subtotal_excluding_tax?: Money;
  subtotal_including_tax?: Money;
  applied_taxes?: Array<{ label?: string; amount?: Money }>;
  discounts?: Array<{ label?: string; amount?: Money }>;
};

export type CartItem = {
  id: string;
  quantity: number;
  prices?: {
    price?: Money;
    row_total?: Money;
    row_total_including_tax?: Money;
    total_item_discount?: Money;
  };
  product: CartProduct;
};

export type Cart = {
  id: string;
  items: CartItem[];
  prices: CartPrices;
  total_quantity?: number | null;
};

// --- ATTRIBUTE TYPES ---
export type CartProduct = {
  sku: string;
  name: string;
  small_image?: { url: string };
  custom_attributes?: CustomAttribute[] | null;
  resolved_price?: {
    custom: { value_incl_tax: number; value_excl_tax: number; currency: string };
    standard: { value_incl_tax: number; value_excl_tax: number; currency: string };
  };
};
export type CustomAttribute = {
  attribute_metadata?: { code?: string | null; label?: string | null } | null;
  entered_attribute_value?: { value?: string | null } | null;
  selected_attribute_options?: {
    attribute_option?: Array<{
      uid?: string | null;
      label?: string | null;
      value?: string | number | null;
    }> | null;
  } | null;
};

// --- SHOPPING LIST TYPES ---

export type ShoppingListSummary = {
  list_id: number;
  list_name: string;
  items_count: number;
};

export type ShoppingListItem = {
  item_id: number;
  sku: string;
  qty: number;
  product: {
    id: number | string;
    sku: string;
    name: string;
    small_image: { url: string };
    resolved_price: {
      custom: { value_incl_tax: number; value_excl_tax: number; currency: string };
      standard: { value_incl_tax: number; value_excl_tax: number; currency: string };
    };
  };
};

export type ShoppingListDetail = {
  list_id: number;
  list_name: string;
  items_count: number;
  items: {
    total_count: number;
    items: ShoppingListItem[];
  };
};

// --- INPUT TYPES (For Mutations) ---

export type ShoppingListItemUpdateInput = {
  item_id: number;
  qty: number;
};
export type TrDeliveryDate = {
  date: string | null;
};