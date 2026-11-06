import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createOnboardedUser, login, SUPABASE_URL, userAccessToken } from "./helpers/supabase";

/** B6 — données réelles uniquement, sur Supabase LOCAL (helper bloque toute autre URL). */
test.describe("P2-B / B6 — découverte des clubs", () => {
  test("état vide authentique et intention Jouer", async ({ page }) => {
    const viewer = await createOnboardedUser();
    await login(page, viewer.email);
    await page.goto("/explore");
    await expect(page).toHaveURL(/\/explore\/clubs$/);
    await expect(page.getByRole("navigation", { name: "Choisir ce que tu recherches" })).toBeVisible();
    // Les autres tests s'exécutent en parallèle et peuvent créer un club sur cette plateforme.
    // Une recherche impossible garantit un état vide filtré véridique, quel que soit cet ordre.
    await page.getByRole("searchbox", { name: "Rechercher un club par nom" }).fill("ZZZnomjamaisutilise");
    await page.getByRole("button", { name: "Chercher" }).click();
    await expect(page.getByRole("heading", { name: "Aucun club ne correspond à tes filtres" })).toBeVisible();
    await page.getByRole("link", { name: "Jouer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Aucune session ouverte pour l'instant" })).toBeVisible();
  });

  test("un club créé par un joueur apparaît via le serveur, se filtre et disparaît après blocage", async ({ page }) => {
    const creator = await createOnboardedUser();
    const viewer = await createOnboardedUser();
    const token = await userAccessToken(creator.email);
    const name = "QA Club " + Date.now().toString(36);
    const headers = {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "Content-Profile": "api",
      "Accept-Profile": "api",
    };
    const response = await fetch(SUPABASE_URL() + "/rest/v1/rpc/create_club", {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_request_id: randomUUID(),
        p_name: name,
        p_description: "Club créé via la commande SQL pour un test local.",
        p_platform: "pc",
        p_languages: ["fr"],
        p_level: "competitive",
        p_recruiting_open: true,
        p_recruiting_positions: ["ST"],
      }),
    });
    expect(response.ok, "create_club local : " + response.status + " " + await response.text()).toBeTruthy();

    await login(page, viewer.email);
    await page.goto("/explore/clubs");
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /\b\d+ clubs? affichés?\b/ })).toBeVisible();

    await page.getByRole("searchbox", { name: "Rechercher un club par nom" }).fill("QA Club");
    await page.getByRole("button", { name: "Chercher" }).click();
    await expect(page).toHaveURL(/q=QA/);
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.getByRole("button", { name: /^Filtres/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filtres des clubs" });
    await sheet.getByLabel("Niveau déclaré").selectOption("elite");
    await sheet.getByRole("button", { name: "Appliquer les filtres" }).click();
    await expect(page.getByRole("heading", { name: "Aucun club ne correspond à tes filtres" })).toBeVisible();
    await page.getByRole("link", { name: "Effacer les filtres" }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    const blocked = await fetch(SUPABASE_URL() + "/rest/v1/rpc/block_user", {
      method: "POST",
      headers,
      body: JSON.stringify({ p_request_id: randomUUID(), p_target: viewer.id }),
    });
    expect(blocked.ok, "block_user local : " + blocked.status + " " + await blocked.text()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("heading", { name })).toHaveCount(0);
  });
});
