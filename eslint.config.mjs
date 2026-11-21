import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Migrated feature modules must not depend on demo records or state.
    files: [
      "src/lib/queries/**/*.ts",
      "src/lib/dashboard/**/*.ts",
      "src/lib/reports/**/*.ts",
      "src/app/(management)/dashboard/**/*.{ts,tsx}",
      "src/app/(management)/reports/_components/{fees,accounts}/**/*.{ts,tsx}",
      "src/lib/{types,constants}/**/*.ts",
      "src/lib/court-utils.ts",
      "src/app/(management)/{students,batches,enquiries,inventory,accounts}/**/*.{ts,tsx}",
      "src/app/(management)/transactions/page.tsx",
      "src/app/(management)/transactions/_components/TransactionsView.tsx",
      "src/components/{students,transactions}/**/*.{ts,tsx}",
    ],
    // Unused legacy modal retained for explicit mock consumers; not in the live Accounts graph.
    ignores: ["src/app/(management)/accounts/_components/AccountEntryModal.tsx", "src/app/(management)/dashboard/_components/DemoMonthlySummaryCard.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/lib/mock-data", "**/mock-data", "**/mock-data.*"],
          message: "Use feature types/constants or server-fetched props. Demo data belongs only in explicitly unmigrated features.",
        }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
