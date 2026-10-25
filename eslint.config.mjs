import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // ADR-0002 : compensation XSS — aucun HTML brut injecté.
      "react/no-danger": "error",
      "no-restricted-syntax": [
        "error",
        {
          // ADR-0002 : getSession() ne doit jamais servir à autoriser.
          selector: "CallExpression[callee.property.name='getSession']",
          message: "getSession() est interdit (ADR-0002) : utiliser getClaims() ou getUser().",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "**/lib/supabase/admin"],
              message: "Client admin (clé secrète) réservé à src/app/api/webhooks/* (ADR-0003).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/api/webhooks/**"],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
