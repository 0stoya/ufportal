import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  // 🔧 Project-wide rule overrides
  {
    rules: {
      // This blocks real-world API + GraphQL code
      "@typescript-eslint/no-explicit-any": "off",

      // This rule is too opinionated and breaks normal data loading
      "react-hooks/set-state-in-effect": "off",

      // Keep hygiene without breaking builds
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" }
      ],

      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
