import { expect, test, type Page } from "@playwright/test";

/**
 * Finitions P2-A (retour QA iPhone de Selim, 28/10) — vérifiées sur petit, moyen et grand iPhone,
 * en clair et en sombre : Connexion (vide supérieur, liens discrets), Profil (carte compacte,
 * ligne EA sur une ligne), Accueil (carte d'identité menant au profil). Données fictives de galerie.
 */
const IPHONES = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPhone 15 Pro Max", width: 430, height: 932 },
] as const;

async function noHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, "aucun défilement horizontal").toBeLessThanOrEqual(client);
}

for (const device of IPHONES) {
  for (const colorScheme of ["dark", "light"] as const) {
    test.describe(`finitions P2-A — ${device.name} — ${colorScheme === "dark" ? "sombre" : "clair"}`, () => {
      test.use({ viewport: { width: device.width, height: device.height }, colorScheme });

      test("Connexion : vide supérieur plafonné, formulaire et action visibles sans défilement, liens discrets", async ({ page }, testInfo) => {
        await page.goto("/login");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Connexion");
        const spacer = await page.getByTestId("auth-top-spacer").boundingBox();
        expect(spacer!.height, "vide supérieur ≤ 12 % de la hauteur").toBeLessThanOrEqual(device.height * 0.12 + 1);
        const submit = await page.getByRole("button", { name: "Se connecter" }).boundingBox();
        expect(submit!.y + submit!.height, "bouton principal visible sans défilement").toBeLessThanOrEqual(device.height);
        // Liens secondaires : texte gris, sans fond ni couleur d'accent.
        const forgot = page.getByRole("link", { name: "Mot de passe oublié ?" });
        const [linkColor, accentColor] = await Promise.all([
          forgot.evaluate((el) => getComputedStyle(el).color),
          page.getByRole("button", { name: "Se connecter" }).evaluate((el) => getComputedStyle(el).backgroundColor),
        ]);
        expect(linkColor).not.toBe(accentColor);
        expect((await forgot.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await noHorizontalOverflow(page);
        await testInfo.attach(`login-${device.name}-${colorScheme}`, { body: await page.screenshot({ caret: "initial" }), contentType: "image/png" });
      });

      test("Profil : carte d'identité compacte, identifiant EA sur une ligne, mention déclarative conservée", async ({ page }, testInfo) => {
        await page.goto("/dev/ui/screens/profile");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profil");
        const card = await page.getByRole("region", { name: "Identité" }).boundingBox();
        expect(card!.height, "carte d'identité compacte").toBeLessThanOrEqual(170);
        const ea = page.getByRole("button", { name: /^Identifiant EA/ });
        expect((await ea.boundingBox())!.height, "ligne EA sans retour à la ligne maladroit").toBeLessThanOrEqual(72);
        await expect(page.getByText("L'identifiant EA est déclaratif : il n'est pas vérifié par CPC.")).toBeVisible();
        await noHorizontalOverflow(page);
        await testInfo.attach(`profile-${device.name}-${colorScheme}`, { body: await page.screenshot({ fullPage: true, caret: "initial" }), contentType: "image/png" });
      });

      test("Accueil : carte d'identité vers le profil, plus de raccourci en double, barre d'onglets visible", async ({ page }, testInfo) => {
        await page.goto("/dev/ui/screens/home");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accueil");
        await expect(page.getByTestId("home-identity")).toHaveAttribute("href", "/profile");
        await expect(page.getByRole("region", { name: "Raccourcis" })).toHaveCount(0);
        const tabs = await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox();
        expect(tabs!.y + tabs!.height, "barre d'onglets entièrement visible").toBeLessThanOrEqual(device.height + 1);
        await noHorizontalOverflow(page);
        await testInfo.attach(`home-${device.name}-${colorScheme}`, { body: await page.screenshot({ fullPage: true, caret: "initial" }), contentType: "image/png" });
      });
    });
  }
}
