import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createOnboardedUser, login, PASSWORD } from "./helpers/supabase";

/** S-1.7 — navigation mobile-first à trois onglets (cahier UX §1–2). Supabase local, CI. */
test.describe("S-1.7 — navigation à trois onglets", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("trois onglets exactement, onglet courant signalé, navigation entre Accueil, Explorer et Profil", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    await page.goto("/home");

    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveCount(3);
    await expect(nav.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    // Aucun onglet Messages (cahier UX §11).
    await expect(nav.getByRole("link", { name: /messages/i })).toHaveCount(0);

    await nav.getByRole("link", { name: "Explorer" }).click();
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explorer");
    await expect(nav.getByRole("link", { name: "Explorer" })).toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Profil" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByTestId("profile-handle")).toHaveText(user.handle);
    // Aucune statistique inventée (principe « données véridiques »).
    await expect(page.getByText("Compte EA non lié : aucune statistique disponible.")).toBeVisible();

    await nav.getByRole("link", { name: "Accueil" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("zones tactiles des onglets ≥ 44 px et aucune violation axe critique ou sérieuse", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    for (const path of ["/home", "/explore", "/profile"]) {
      await page.goto(path);
      for (const link of await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box?.height ?? 0, `hauteur d'onglet sur ${path}`).toBeGreaterThanOrEqual(44);
      }
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(serious.map((v) => `${v.id}: ${v.help}`), `axe sur ${path}`).toEqual([]);
    }
  });

  test("onglets privés inaccessibles sans session, puis retour au contexte après connexion (AUTH-05)", async ({ page }) => {
    for (const path of ["/explore", "/profile"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=(%2F|/)${path.slice(1)}$`));
    }
    const user = await createOnboardedUser();
    await page.goto("/explore");
    await page.getByLabel("Adresse email").fill(user.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/explore$/);
  });

  test("en-tête de chemin forgé par le client ignoré (anti open redirect)", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-cpc-pathname": "//evil.example/phish" });
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)profile$/);
  });
});

/** P2-A (docs/23 §7) : captures des écrans réels du shell (clair et sombre), jointes au rapport CI. */
test.describe("P2-A — écrans du shell", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  for (const colorScheme of ["dark", "light"] as const) {
    test(`captures Accueil, Explorer, Profil et sheet — ${colorScheme}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      const user = await createOnboardedUser();
      await login(page, user.email);
      for (const path of ["/home", "/explore", "/profile"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await testInfo.attach(`${path.slice(1)}-${colorScheme}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      }
      await page.getByRole("button", { name: /^Présentation/ }).click();
      await expect(page.getByRole("dialog", { name: "Présentation" })).toBeVisible();
      await testInfo.attach(`profile-sheet-${colorScheme}`, { body: await page.screenshot(), contentType: "image/png" });
    });
  }

  test("titre compact du Profil au défilement", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    // Écran court : le contenu du Profil dépasse forcément la hauteur visible.
    await page.setViewportSize({ width: 390, height: 520 });
    await page.goto("/profile");
    const compact = page.getByTestId("header-compact-title");
    await expect(compact).toHaveCSS("opacity", "0");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(compact).toHaveText("Profil");
    await expect(compact).toHaveCSS("opacity", "1");
  });
});
