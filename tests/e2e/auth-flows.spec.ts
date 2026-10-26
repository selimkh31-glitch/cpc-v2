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
    // Cause racine des échecs intermittents : la navigation client vers /forgot-password n'était pas attendue ;
    // le champ « Adresse email » rempli pouvait être celui de la page de connexion encore affichée, et le
    // formulaire de récupération partait vide (bloqué par « required », URL inchangée).
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mot de passe oublié");
    await page.getByLabel("Adresse email").fill(user.email);
    await expect(page.getByLabel("Adresse email")).toHaveValue(user.email);
    // Délai de redirection mesuré et consigné (délai par défaut d'expect : aucune augmentation de timeout).
    const t0 = Date.now();
    await page.getByRole("button", { name: "Recevoir un lien" }).click();
    await expect(page).toHaveURL(/\/forgot-password\?sent=1$/);
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

    // S-1.7 : la déconnexion se trouve dans Profil → Paramètres (cahier UX §7).
    await page.getByRole("link", { name: "Profil" }).click();
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
    await page.goto("/profile");
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)home$/);
  });

  test("AUTH-02 — aucun bouton Google affiché tant que le fournisseur n'est pas configuré", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
  });

  test("QA iPhone A-5 — / redirige selon la session : anonyme → /login, connecté → /home", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    const user = await createOnboardedUser();
    await login(page, user.email);
    await page.goto("/");
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accueil");
  });

  test("QA iPhone A-3 — connexion : un seul envoi malgré le double appui et la touche Entrée", async ({ page }) => {
    const user = await createOnboardedUser();
    await page.goto("/login?next=/home");
    await page.getByLabel("Adresse email").fill(user.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);

    // Actions serveur envoyées (POST portant l'en-tête Next-Action).
    const actions: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.headers()["next-action"]) actions.push(r.url());
    });
    // Réseau mobile lent simulé : la réponse de l'action est retardée, la fenêtre de double envoi est ouverte.
    await page.route(/\/login/, async (route) => {
      if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    // Deux appuis rapprochés (cas observé sur iPhone : 14 connexions en 9 s).
    await page.getByRole("button", { name: "Se connecter" }).dblclick();
    const pending = page.getByRole("button", { name: "Envoi en cours…" });
    await expect(pending).toBeDisabled();
    await expect(pending).toHaveAttribute("aria-busy", "true");
    // Entrée dans le champ : la soumission implicite ne doit pas repartir pendant l'envoi.
    await page.getByLabel("Mot de passe").press("Enter");

    await expect(page).toHaveURL(/\/home$/);
    expect(actions, "une seule action de connexion envoyée").toHaveLength(1);
  });

  test("QA iPhone A-3 — inscription et mot de passe oublié : bouton verrouillé pendant l'envoi", async ({ page }) => {
    const actions: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.headers()["next-action"]) actions.push(new URL(r.url()).pathname);
    });
    await page.route(/\/(signup|forgot-password)/, async (route) => {
      if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto("/signup");
    await page.getByLabel("Adresse email").fill(`qa_${randomUUID().slice(0, 8)}@example.test`);
    await page.getByLabel("Mot de passe").fill(`Qa${randomUUID().replace(/-/g, "").slice(0, 12)}9z`);
    await page.getByRole("button", { name: "Créer mon compte" }).dblclick();
    await expect(page.getByRole("button", { name: "Envoi en cours…" })).toBeDisabled();
    await expect(page).toHaveURL(/\/signup\?sent=1/);

    await page.goto("/forgot-password");
    await page.getByLabel("Adresse email").fill(`qa_${randomUUID().slice(0, 8)}@example.test`);
    await page.getByRole("button", { name: "Recevoir un lien" }).dblclick();
    await expect(page.getByRole("button", { name: "Envoi en cours…" })).toBeDisabled();
    await expect(page).toHaveURL(/\/forgot-password\?sent=1$/);

    expect(actions, "une action par formulaire").toEqual(["/signup", "/forgot-password"]);
  });
});
