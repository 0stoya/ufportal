// lib/typesense/config.ts

export const TYPESENSE_COLLECTION =
  process.env.NEXT_PUBLIC_TYPESENSE_COLLECTION || "products";

export const TYPESENSE_HOST = process.env.NEXT_PUBLIC_TYPESENSE_HOST!;
export const TYPESENSE_PROTOCOL = process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || "https";
export const TYPESENSE_PORT = Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT || "443");
export const TYPESENSE_PATH = process.env.NEXT_PUBLIC_TYPESENSE_PATH || "/typesense";
export const TYPESENSE_API_KEY = process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY!;
export const HAS_TYPESENSE_CLIENT_CONFIG = Boolean(TYPESENSE_HOST && TYPESENSE_API_KEY);

/**
 * Shared Search Parameters
 * Used by both InstantSearch (Client) and API Route (Server)
 * to ensure inconsistent results don't happen.
 */
export const SEARCH_CONFIG = {
  // Fields to search
  query_by: "name,sku,caterfood_promo,meta_keyword,brand,tr_cat_key",
  
  // Relevance weights (must match query_by order)
  query_by_weights: "12,6,5,15,8,16",

  // Typo Tolerance:
  // name:2 (allow typos), sku:0 (strict), brand:1...
  num_typos: "2,0,2,1,1,2",
  
  // Thresholds
min_len_1typo: 4, // Allow 1 typo for words length 3+ (e.g. "mlik" -> "milk")
  min_len_2typo: 8,
  
  // Strictness
  exhaustive_search: false,
  drop_tokens_threshold: 0,                 // Keep for now – strict AND is good for your use-case
  typo_tokens_threshold: 1,
  infix: "off", // disable expensive infix search unless needed
  
  // Ranking
  prefix: true, // boolean, not string
  prioritize_exact_match: true,
  prioritize_token_position: true,
  
  // Filtering
  filter_by: "is_active:=true",
};
