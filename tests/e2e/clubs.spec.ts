import { expect, test } from "@playwright/test";
import { createOnboardedUser, login } from "./helpers/supabase";

/** B5 — clubs réels : environnement Supabase LOCAL exclusivement, jamais staging/Production. */
test.describe("P2-B / B5 — création et gestion de clubs", () => {
  test("anonyme : la création d'un club requiert l'authentification", async ({ page }) => {
    await page.goto("/clubs/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fclubs%2Fnew/);
  });

  test("le créateur devient OWNER, peut gérer le recrutement, voit Mes clubs ; un autre joueur ne peut pas gérer", async ({ browser }) => {
    const owner = await createOnboardedUser();
    const other = await createOnboardedUser();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await login(page, owner.email);
      await page.goto("/clubs/new");
      const name = "Club " + Date.now().toString(36);
      await page.getByLabel("Nom du club").fill(name);
      await page.getByLabel("Description").fill("Club QA pour valider le vrai parcours utilisateur.");
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.getByRole("radio", { name: "Compétitif" }).check();
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.getByRole("checkbox", { name: "ST", exact: true }).check();
      await page.getByRole("button", { name: "Créer mon club" }).click();
      await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]{36}$/);
      const clubUrl = new URL(page.url()).pathname;
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(page.getByText("OWNER", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Effectif/ })).toBeVisible();

      await page.goto("/profile");
      await expect(page.getByRole("region", { name: "Mes clubs" })).toContainText(name);
      await expect(page.getByRole("region", { name: "Mes clubs" })).toContainText("Club principal");

      await page.goto(clubUrl + "/manage/settings");
      await expect(page.getByRole("heading", { name: "Réglages du club" })).toBeVisible();
      await page.getByLabel("Description").fill("Nouvelle description enregistrée par le propriétaire.");
      await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
      await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]{36}\?saved=settings$/);
      await expect(page.getByText("Nouvelle description enregistrée par le propriétaire.")).toBeVisible();

      const strangerContext = await browser.newContext();
      try {
        const stranger = await strangerContext.newPage();
        await login(stranger, other.email);
        await stranger.goto(clubUrl);
        await expect(stranger.getByRole("heading", { name, exact: true })).toBeVisible();
        await expect(stranger.getByRole("link", { name: "Gérer le recrutement" })).toHaveCount(0);
        await stranger.goto(clubUrl + "/manage/settings");
        await expect(stranger.getByText(/Page introuvable|introuvable/i).first()).toBeVisible();
      } finally {
        await strangerContext.close();
      }
    } finally {
      await context.close();
    }
  });
});
