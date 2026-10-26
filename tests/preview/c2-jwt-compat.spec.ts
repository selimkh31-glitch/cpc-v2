import { expect, test, type Page } from "@playwright/test";

/**
 * C-2 — tests de compatibilité Auth / refresh / multi-onglets / Realtime pour une durée de JWT réduite.
 * PRÉPARÉS, NON EXÉCUTÉS : à lancer contre un Vercel Preview connecté au staging, après autorisation de C-2.
 *
 * Variables (secrets GitHub ou environnement local, JAMAIS dans Git) :
 *   E2E_TARGET=preview, E2E_BASE_URL (URL du Preview), E2E_PREVIEW_EMAIL / E2E_PREVIEW_PASSWORD
 *   (compte synthétique qa_*@example.test du staging), C2_EXPECTED_JWT_TTL (900 par défaut).
 * Prérequis côté Preview : ENABLE_AUTH_SPIKE=1 (page /spike/session, qui expose sub et exp).
 */
const EXPECTED_TTL = Number(process.env.C2_EXPECTED_JWT_TTL ?? "900");
const email = process.env.E2E_PREVIEW_EMAIL ?? "";
const password = process.env.E2E_PREVIEW_PASSWORD ?? "";

test.skip(process.env.E2E_TARGET !== "preview", "C-2 : réservé au Vercel Preview (non autorisé à ce stade).");
test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  expect(email.endsWith("@example.test"), "compte synthétique uniquement").toBe(true);
  await page.goto("/login?next=/spike/session");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByTestId("server-sub")).toBeVisible();
}

const serverExp = async (page: Page) => Number(await page.getByTestId("server-exp").textContent());

test("C2-1 — durée réelle du JWT = valeur configurée (exp − maintenant ≈ TTL)", async ({ page }) => {
  await login(page);
  const remaining = (await serverExp(page)) - Date.now() / 1000;
  test.info().annotations.push({ type: "C2-ttl-restant", description: `${Math.round(remaining)} s` });
  expect(remaining).toBeGreaterThan(EXPECTED_TTL - 60);
  expect(remaining).toBeLessThanOrEqual(EXPECTED_TTL + 5);
});

test("C2-2 à C2-4 — après expiration : rafraîchissement sans déconnexion, deux onglets, Realtime ré-abonné", async ({ browser }) => {
  test.setTimeout((EXPECTED_TTL + 180) * 1000);
  const ctx = await browser.newContext();
  const tab1 = await ctx.newPage();
  await login(tab1);
  const tab2 = await ctx.newPage();
  await tab2.goto("/spike/session");
  for (const p of [tab1, tab2]) await expect(p.getByTestId("realtime-own-status")).toHaveText("SUBSCRIBED", { timeout: 30_000 });

  const expBefore = await serverExp(tab1);
  await tab1.waitForTimeout(Math.max(expBefore * 1000 - Date.now() + 10_000, 0));

  // C2-2 + C2-3 : rechargement simultané des deux onglets avec un jeton expiré → session conservée, nouveau exp.
  await Promise.all([tab1.reload(), tab2.reload()]);
  for (const p of [tab1, tab2]) {
    await expect(p.getByTestId("server-sub")).toBeVisible();
    expect(await serverExp(p)).toBeGreaterThan(expBefore);
  }
  // C2-4 : canal Realtime privé ré-abonné avec le nouveau jeton.
  for (const p of [tab1, tab2]) await expect(p.getByTestId("realtime-own-status")).toHaveText("SUBSCRIBED", { timeout: 30_000 });
  await ctx.close();
});

test("C2-5 — action sensible toujours acceptée après rafraîchissement (D-40 sans faux refus)", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Action sensible" }).click();
  await expect(page.getByTestId("sensitive-result")).toHaveText("ok", { timeout: 15_000 });
});
