import type { MetadataRoute } from "next";

/**
 * PWA installable (plan Phase 1, S-1.11). Aucun service worker : pas de cache de données privées
 * (D-08 proposé, non validé). Couleurs alignées sur les jetons provisoires (ADR-0006).
 *
 * Servi par un gestionnaire de route (et non par la convention `app/manifest.ts`) : la convention
 * injecte un `<link rel="manifest">` sans `crossorigin`. Or, derrière Vercel Authentication (Preview
 * protégée), le navigateur récupère le manifest SANS cookie par défaut → 401 → PWA dégradée.
 * Le lien est donc émis à la main dans `app/layout.tsx` avec `crossorigin="use-credentials"`.
 */
export const dynamic = "force-static";

const manifest: MetadataRoute.Manifest = {
  name: "ClubPro Connect",
  short_name: "CPC",
  description: "Trouver une occasion de jouer, recruter et gérer une session LIVE sur EA FC Clubs.",
  lang: "fr",
  dir: "ltr",
  start_url: "/home",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0a0a0a",
  theme_color: "#0a0a0a",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
