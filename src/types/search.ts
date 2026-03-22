export type Money = { value_incl_tax: number; value_excl_tax: number; currency: string };

export type Product = {
  id: number;
  sku: string;
  name: string;
  
  // ✅ CHANGED: Backend now sends this as a simple string URL
  small_image?: string | null;

  units?: string | null;
  bbe?: string | null;
  featured_product?: number | null;
  m_special_price?: number | null;
  resolved_price?: {
    custom?: Money | null;
    standard?: Money | null;
  } | null;
};

export type SearchMode = "strict" | "fallback";

export type SearchResponse = {
  mode?: SearchMode;
  items: Product[];
  total_count: number;
  page_info?: { total_pages: number; current_page: number };
};