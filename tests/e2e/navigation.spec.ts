import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createOnboardedUser, login } from "./helpers/supabase";

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

  test("onglets privés inaccessibles sans session", async ({ page }) => {
    for (const path of ["/explore", "/profile"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=(%2F|/)${path.slice(1)}$`));
    }
  });
});
