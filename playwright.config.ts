import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Projets : mobile Chromium (Pixel), mobile WebKit (iPhone), desktop Chromium.
 * En local, seul Chromium peut être disponible : `pnpm test:e2e --project=mobile-chromium`.
 */
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
  projects: [
    { name: "mobile-chromium", testIgnore: /(auth-(spike|flows)|onboarding)/, use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", testIgnore: /(auth-(spike|flows)|onboarding)/, use: { ...devices["iPhone 14"] } },
    { name: "desktop-chromium", testIgnore: /(auth-(spike|flows)|onboarding)/, use: { ...devices["Desktop Chrome"] } },
    // Spike S-1.4a : requiert Supabase local (CI) ; attentes d'expiration longues, un seul navigateur.
    { name: "auth-spike", testMatch: /(auth-(spike|flows)|onboarding)\.spec\.ts/, retries: 0, use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
