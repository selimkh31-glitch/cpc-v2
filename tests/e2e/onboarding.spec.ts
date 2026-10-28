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
    // P2-A : même formulaire, en 3 étapes (Identité → Postes → Confirmation), un seul envoi.
    await page.getByLabel("Pseudo CPC", { exact: true }).fill(handle.toUpperCase());
    await page.getByRole("radio", { name: "PC", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("radio", { name: "CB — Défenseur central", exact: true }).check();
    await page.getByRole("checkbox", { name: "LB — Arrière gauche", exact: true }).check();
    await page.getByRole("checkbox", { name: "CDM — Milieu défensif", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
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
    await page.getByLabel("Pseudo CPC", { exact: true }).fill(taken.handle);
    await page.getByRole("radio", { name: "PS5", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("radio", { name: "ST — Avant-centre", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel(/ans ou plus/).check();
    await page.getByRole("button", { name: "Créer mon profil" }).click();
    await expect(page).toHaveURL(/\/onboarding\?error=CONFLICT$/);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Ce pseudo est déjà pris.");
    await page.goto("/home");
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("poste secondaire identique au principal : refus de validation côté serveur", async ({ page }) => {
    const user = await createConfirmedUser();
    await login(page, user.email);
    await page.goto("/onboarding");
    await page.getByLabel("Pseudo CPC", { exact: true }).fill(`qa_${Date.now().toString(36)}b`);
    await page.getByRole("radio", { name: "Xbox Series", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("radio", { name: "GK — Gardien", exact: true }).check();
    await page.getByRole("checkbox", { name: "GK — Gardien", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel(/ans ou plus/).check();
    await page.getByRole("button", { name: "Créer mon profil" }).click();
    await expect(page).toHaveURL(/\/onboarding\?error=VALIDATION$/);
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  });

  test("P2-A — étapes : étape incomplète bloquée, retour arrière sans perte, envoi unique", async ({ page }) => {
    const user = await createConfirmedUser();
    await login(page, user.email);
    await page.goto("/onboarding");
    await expect(page.getByText("Étape 1 sur 3")).toBeVisible();

    // Étape incomplète : « Continuer » ne passe pas à l'étape suivante (validation native).
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByText("Étape 1 sur 3")).toBeVisible();

    const handle = `qa_${Date.now().toString(36)}c`;
    await page.getByLabel("Pseudo CPC", { exact: true }).fill(handle);
    await page.getByRole("radio", { name: "PS5", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByText("Étape 2 sur 3")).toBeVisible();

    // Retour : la saisie de l'étape 1 est conservée.
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByLabel("Pseudo CPC", { exact: true })).toHaveValue(handle);
    await expect(page.getByRole("radio", { name: "PS5", exact: true })).toBeChecked();

    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("radio", { name: "CAM — Milieu offensif", exact: true }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel(/ans ou plus/).check();

    const actions: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.headers()["next-action"]) actions.push(r.url());
    });
    await page.getByRole("button", { name: "Créer mon profil" }).dblclick();
    await expect(page).toHaveURL(/\/home$/);
    expect(actions, "un seul envoi").toHaveLength(1);
  });
});
