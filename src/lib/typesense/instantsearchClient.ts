// lib/typesense/instantsearchClient.ts
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import {
  TYPESENSE_API_KEY,
  TYPESENSE_HOST,
  TYPESENSE_PATH,
  TYPESENSE_PORT,
  TYPESENSE_PROTOCOL,
  SEARCH_CONFIG,
  HAS_TYPESENSE_CLIENT_CONFIG,
} from "./config";

const typesenseInstantsearchAdapter = HAS_TYPESENSE_CLIENT_CONFIG
  ? new TypesenseInstantSearchAdapter({
      server: {
        apiKey: TYPESENSE_API_KEY,
        nodes: [
          {
            host: TYPESENSE_HOST,
            port: TYPESENSE_PORT,
            protocol: TYPESENSE_PROTOCOL,
            path: TYPESENSE_PATH,
          },
        ],
        cacheSearchResultsForSeconds: 0, // Set to ~120 in production
      },
      additionalSearchParameters: {
        ...SEARCH_CONFIG,
        drop_tokens_threshold: 0,
        prefix: true,
        infix: "off",
        // InstantSearch specific override (if needed)
        per_page: 8,
      },
    })
  : null;

export const searchClient = typesenseInstantsearchAdapter?.searchClient ?? null;
