import { expect, test } from "@playwright/test";
import { createOnboardedUser, login } from "./helpers/supabase";

test.describe("P2-B · B5 — clubs sur le web", () => {
  test("créer un club en trois étapes, fiche, gestion et Mes clubs", async ({ page }) => {
    const a = await createOnboardedUser();
    await login(page, a.email);
    await page.goto("/clubs/new");
    await expect(page.getByRole("heading", { name: "Créer un club" })).toBeVisible();
    const name = "QA FC " + Date.now().toString(36);

    await page.getByLabel("Nom du club").fill(name);
    await page.getByLabel("Description (facultative)").fill("Recrutement pour jouer ensemble.");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByText("Étape 2 sur 3")).toBeVisible();
    await page.getByLabel("Plateforme").selectOption("ps5");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByText("Étape 3 sur 3")).toBeVisible();
    await page.getByRole("checkbox", { name: "ST", exact: true }).check();

    const actions: string[] = [];
    page.on("request", (req) => { if (req.method() === "POST" && req.headers()["next-action"]) actions.push(req.url()); });
    await page.getByRole("button", { name: "Créer mon club" }).dblclick();
    await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\?created=1$/);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("Club enregistré.")).toBeVisible();
    expect(actions, "une seule requête serveur pour le double tap").toHaveLength(1);

    await page.getByRole("link", { name: "Gérer le recrutement" }).click();
    await expect(page.getByRole("heading", { name: "Gérer le recrutement" })).toBeVisible();
    await page.getByLabel("Description").fill("Nouveau descriptif du club QA.");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\?updated=1$/);
    await expect(page.getByText("Nouveau descriptif du club QA.")).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByText("Mes clubs")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  });

  test("un autre joueur authentifié peut lire la fiche sans gérer ce club", async ({ page, browser }) => {
    const a = await createOnboardedUser();
    const b = await createOnboardedUser();
    await login(page, a.email);
    await page.goto("/clubs/new");
    const name = "QA FC " + Date.now().toString(36);
    await page.getByLabel("Nom du club").fill(name);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("button", { name: "Créer mon club" }).click();
    await expect(page).toHaveURL(/\/clubs\/[0-9a-f-]+\?created=1$/);
    const pathname = new URL(page.url()).pathname;

    const contextB = await browser.newContext();
    try {
      const pageB = await contextB.newPage();
      await login(pageB, b.email);
      await pageB.goto(pathname);
      await expect(pageB.getByRole("heading", { name })).toBeVisible();
      await expect(pageB.getByRole("link", { name: "Gérer le recrutement" })).toHaveCount(0);
      await expect(pageB.getByText(a.handle)).toBeVisible();
    } finally {
      await contextB.close();
    }
  });

  test("un visiteur non connecté est renvoyé à la connexion", async ({ page }) => {
    await page.goto("/clubs/new");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
