import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Projets : mobile Chromium (Pixel), mobile WebKit (iPhone), desktop Chromium.
 * En local, seul Chromium peut être disponible : `pnpm test:e2e --project=mobile-chromium`.
 */
const SUPABASE_SPECS = /(auth-(spike|flows)|onboarding|navigation|states|profile|a11y)\.spec\.ts/;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]]
    : "list",
  // Une action bloquée échoue en 15 s avec son journal, au lieu d'épuiser le délai global du test.
  use: { baseURL, trace: "retain-on-failure", actionTimeout: 15_000, navigationTimeout: 30_000 },
  // Specs nécessitant Supabase local : un seul motif, exclu des projets « smoke » et inclus dans « auth-spike ».
  projects: [
    // G2 — HTTP réel sur le staging (workflow manuel staging-http) : uniquement avec E2E_TARGET=staging.
    ...(process.env.E2E_TARGET === "staging" ? [{ name: "staging-http", testDir: "./tests/staging", retries: 0 }] : []),
    // C-2 (préparé, non exécuté) : uniquement avec E2E_TARGET=preview et E2E_BASE_URL.
    ...(process.env.E2E_TARGET === "preview" ? [{ name: "preview-c2", testDir: "./tests/preview", retries: 0, use: { ...devices["Desktop Chrome"] } }] : []),
    { name: "mobile-chromium", testIgnore: SUPABASE_SPECS, use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", testIgnore: SUPABASE_SPECS, use: { ...devices["iPhone 14"] } },
    { name: "desktop-chromium", testIgnore: SUPABASE_SPECS, use: { ...devices["Desktop Chrome"] } },
    // Spike S-1.4a : requiert Supabase local (CI) ; attentes d'expiration longues, un seul navigateur.
    { name: "auth-spike", testMatch: SUPABASE_SPECS, retries: 0, use: { ...devices["Desktop Chrome"] } },
  ],
  // Les tests HTTP du staging n'ont pas besoin de l'application : aucun serveur démarré.
  webServer: process.env.E2E_BASE_URL || process.env.E2E_TARGET === "staging"
    ? undefined
    : {
        command: `pnpm start --port ${PORT}`,
        // Galerie du design system (P2-A) : serveur de test uniquement, jamais sur Vercel.
        env: { ...process.env, ENABLE_UI_GALLERY: "1" } as Record<string, string>,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
