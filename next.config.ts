import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  swSrc: "src/sw/worker.ts",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  // Keep Workbox rules explicit. The default generic /api cache rule can cache
  // unauthorized responses and replay them after login.
  extendDefaultRuntimeCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline.html" },

  runtimeCaching: [
    // ✅ 0) NEVER cache search (prevents stale results / mismatch vs curl)
    {
      urlPattern: /\/api\/products\/search.*/i,
      handler: "NetworkOnly",
    },

    // 1) Cache Product Images (Long term)
    {
      urlPattern: /^https:\/\/www\.demo\.thomasridley\.co\.uk\/media\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "product-images",
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },

    // 2) Cache Catalog/Dashboard Data (StaleWhileRevalidate)
    // ✅ Exclude /api/products/search specifically
    {
      urlPattern: /\/api\/(dashboard|products(?!\/search)|revalidate).*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-catalog",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },

    // 3) NEVER Cache Authenticated session endpoints
    {
      urlPattern: /\/api\/(auth|bootstrap|cart|checkout|orders|me|profile).*/i,
      handler: "NetworkOnly",
    },

    // 4) Vendor Probe
    {
      urlPattern: ({ url }: any) => url.pathname.startsWith("/api/vendor/orders/probe"),
      handler: "NetworkOnly",
    },
  ],
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.demo.thomasridley.co.uk", pathname: "/media/**" },
      { protocol: "https", hostname: "www.demo.thomasridley.co.uk", pathname: "/static/**" },
      { protocol: "https", hostname: "www.demo.thomasridley.co.uk", pathname: "/graphql/**" },
    ],
    qualities: [60, 75],
  },
};

export default withPWA(nextConfig);
