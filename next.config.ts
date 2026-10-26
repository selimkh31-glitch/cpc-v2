import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * ADR-0017 (proposé) : Cache Components et partial prefetching désactivés.
 * La CSP à nonce (ADR-0002) exige un rendu dynamique, incompatible avec le
 * prerendering partiel (cf. node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * La CSP elle-même est posée par src/proxy.ts (nonce par requête).
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const config = withNextIntl(nextConfig);

/**
 * ADR-0012 : upload des source maps UNIQUEMENT si SENTRY_AUTH_TOKEN est présent.
 * Sans jeton, le SDK n'est même pas importé ici : le build ne dépend jamais de Sentry.
 */
export default async function nextConfigWithOptionalSentry() {
  if (!process.env.SENTRY_AUTH_TOKEN) return config;
  const { withSentryConfig } = await import("@sentry/nextjs/config");
  return withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    telemetry: false,
  });
}
