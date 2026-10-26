import { expect, test } from "@playwright/test";
import { createConfirmedUser, createOnboardedUser, login } from "./helpers/supabase";

/** S-1.6 — onboarding (Supabase local, CI). */
test.describe("S-1.6 — onboarding", () => {
  test("nouveau compte : /home redirige vers l'onboarding, puis profil créé et accès à l'accueil", async ({ page }) => {
    const user = await createConfirmedUser();
    await login(page, user.email);
    await page.goto("/home");
    await expect(page).toHaveURL(/\/onboarding$/);

    const handle = `qa_${Date.now().toString(36)}`;
    await page.getByLabel("Pseudo CPC").fill(handle.toUpperCase());
    await page.getByLabel("PC").check();
    await page.getByLabel("Poste principal").selectOption("CB");
    await page.getByLabel("LB — Arrière gauche").check();
    await page.getByLabel("CDM — Milieu défensif").check();
    await page.getByLabel(/ans ou plus/).check();
    await page.getByRole("button", { name: "Créer mon profil" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accueil");
    // Une fois le profil créé, l'onboarding n'est plus accessible.
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/home$/);
  });

  test("pseudo déjà pris : refus explicite, aucun profil créé", async ({ page }) => {
    const taken = await createOnboardedUser();
    const user = await createConfirmedUser();
    await login(page, user.email);
    await page.goto("/onboarding");
    await page.getByLabel("Pseudo CPC").fill(taken.handle);
    await page.getByLabel("PS5").check();
    await page.getByLabel("Poste principal").selectOption("ST");
    await page.getByLabel(/ans ou plus/).check();
    await page.getByRole("button", { name: "Créer mon profil" }).click();
    await expect(page).toHaveURL(/\/onboarding\?error=CONFLICT$/);
    await expect(page.getByRole("alert")).toHaveText("Ce pseudo est déjà pris.");
    await page.goto("/home");
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("poste secondaire identique au principal : refus de validation côté serveur", async ({ page }) => {
    const user = await createConfirmedUser();
    await login(page, user.email);
    await page.goto("/onboarding");
    await page.getByLabel("Pseudo CPC").fill(`qa_${Date.now().toString(36)}b`);
    await page.getByLabel("Xbox Series").check();
    await page.getByLabel("Poste principal").selectOption("GK");
    await page.getByLabel("GK — Gardien").check();
    await page.getByLabel(/ans ou plus/).check();
    await page.getByRole("button", { name: "Créer mon profil" }).click();
    await expect(page).toHaveURL(/\/onboarding\?error=VALIDATION$/);
    await expect(page.getByRole("alert")).toBeVisible();
  });
});
