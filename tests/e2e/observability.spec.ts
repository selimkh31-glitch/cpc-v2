import { expect, test } from "@playwright/test";

/** S-1.12 / ADR-0012 — sans variable Sentry : aucun chargement du SDK, aucun appel réseau, aucune erreur console. */
test("sans Sentry configuré : aucune requête d'observabilité ni erreur console", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await page.goto("/");
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  expect(requests.filter((u) => /sentry|ingest/i.test(u)), "aucun appel Sentry").toEqual([]);
  expect(requests.filter((u) => /@sentry|sentry.*\.js/i.test(u)), "SDK Sentry non chargé").toEqual([]);
  expect(consoleErrors).toEqual([]);
});
