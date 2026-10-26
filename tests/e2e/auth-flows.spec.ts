import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createConfirmedUser, createOnboardedUser, login, waitForEmailLink, PASSWORD } from "./helpers/supabase";

/** S-1.4 / S-1.5 — parcours d'authentification définitifs et garde d'accès (Supabase local, CI). */
test.describe("S-1.4 / S-1.5 — authentification et garde d'accès", () => {
  test("AUTH-05 — anonyme sur /home : redirection vers la connexion puis retour au contexte", async ({ page }) => {
    const user = await createOnboardedUser();
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)home$/);
    await page.getByLabel("Adresse email").fill(user.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accueil");
  });

  test("T-14 — /admin introuvable pour un anonyme et pour un joueur", async ({ page }) => {
    const anon = await page.goto("/admin");
    expect(anon?.status()).toBe(404);
    const user = await createConfirmedUser();
    await login(page, user.email);
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
  });

  test("AUTH-01 — mot de passe oublié : lien email, nouveau mot de passe, ancien refusé", async ({ page }) => {
    const user = await createOnboardedUser();
    await page.goto("/login");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await page.getByLabel("Adresse email").fill(user.email);
    // L'action serveur attend l'envoi de l'email par Supabase avant de rediriger : délai variable en CI.
    // On attend la redirection réelle (15 s) et on consigne la durée mesurée.
    const t0 = Date.now();
    await page.getByRole("button", { name: "Recevoir un lien" }).click();
    await expect(page).toHaveURL(/\/forgot-password\?sent=1$/, { timeout: 15_000 });
    test.info().annotations.push({ type: "AUTH-01-délai-envoi", description: `${Date.now() - t0} ms` });
    await expect(page.getByRole("status")).toBeVisible();

    const link = await waitForEmailLink(user.email);
    await page.goto(link);
    await expect(page).toHaveURL(/\/reset-password$/);
    // Généré à l'exécution (synthétique, lettres + chiffres) : aucun mot de passe littéral dans le dépôt.
    const newPassword = `Qa${randomUUID().replace(/-/g, "").slice(0, 12)}9z`;
    await page.getByLabel("Nouveau mot de passe").fill(newPassword);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Ancien mot de passe refusé, nouveau accepté.
    await page.goto("/login?next=/home");
    await page.getByLabel("Adresse email").fill(user.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login\?error=invalid/);
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    // La page d'erreur est un nouveau rendu : l'email n'est pas conservé.
    await page.getByLabel("Adresse email").fill(user.email);
    await page.getByLabel("Mot de passe").fill(newPassword);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("AUTH-01 — mot de passe oublié sur une adresse inconnue : même réponse (pas d'énumération)", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Adresse email").fill("qa_inconnu_0000@example.test");
    await page.getByRole("button", { name: "Recevoir un lien" }).click();
    await expect(page).toHaveURL(/\/forgot-password\?sent=1$/);
  });

  test("Déconnexion : la page privée redevient inaccessible", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    await page.goto("/home");
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)home$/);
  });

  test("AUTH-02 — aucun bouton Google affiché tant que le fournisseur n'est pas configuré", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
  });
});
