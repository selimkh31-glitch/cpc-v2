import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * P2-A (docs/23 §7) — galerie du design system : accessibilité clair/sombre, CSP sans violation,
 * cibles tactiles ≥ 44 px, captures iPhone jointes au rapport.
 */
for (const colorScheme of ["dark", "light"] as const) {
  test.describe(`galerie UI — thème ${colorScheme === "dark" ? "sombre" : "clair"}`, () => {
    test.use({ colorScheme });

    test("rendu, accessibilité, CSP et cibles tactiles", async ({ page }, testInfo) => {
      const cspErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && /Content Security Policy|CSP/i.test(msg.text())) cspErrors.push(msg.text());
      });

      const response = await page.goto("/dev/ui");
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Galerie UI");

      // Le thème suit le réglage de l'appareil (fond sombre ou clair).
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg).toBe(colorScheme === "dark" ? "rgb(5, 6, 7)" : "rgb(242, 242, 244)");

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);

      // Cibles tactiles : chaque bouton mesure au moins 44 × 44 px.
      for (const button of await page.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box, await button.textContent() ?? "bouton").not.toBeNull();
        expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box!.width)).toBeGreaterThanOrEqual(44);
      }

      await page.waitForLoadState("networkidle");
      expect(cspErrors).toEqual([]);

      await testInfo.attach(`galerie-${colorScheme}-${testInfo.project.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  });
}

test("Reduce Motion : aucune animation résiduelle sur les squelettes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/ui");
  const animation = await page.locator(".animate-pulse").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
});

test.describe("P2-A · A2 — sheets et shell", () => {
  test("une seule sheet à la fois, Échap, voile, focus et verrou de défilement", async ({ page }) => {
    const cspErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Content Security Policy|CSP/i.test(msg.text())) cspErrors.push(msg.text());
    });
    await page.goto("/dev/ui");

    await page.getByRole("button", { name: "Ouvrir la fiche A" }).click();
    const sheetA = page.getByRole("dialog", { name: "Fiche A" });
    await expect(sheetA).toBeVisible();
    // Le focus est dans la sheet (modal natif : le reste de la page est inerte).
    expect(await sheetA.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");

    // Ouvrir B depuis A : A se ferme, jamais deux sheets.
    await sheetA.getByRole("button", { name: "Ouvrir la fiche B" }).click();
    await expect(page.getByRole("dialog", { name: "Fiche B" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect.poll(() => page.locator("dialog[data-sheet][open]").count()).toBe(1);
    // La fermeture de A ne doit pas rendre le défilement tant que B est ouverte.
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");

    // Échap ferme ; le défilement est rendu.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // L'événement « close » du <dialog> est asynchrone : le verrou est libéré juste après.
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");

    // Tap sur le voile (haut de l'écran, hors du panneau) : fermeture.
    await page.getByRole("button", { name: "Ouvrir la fiche A" }).click();
    await expect(sheetA).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Bouton Fermer.
    await page.getByRole("button", { name: "Ouvrir la fiche A" }).click();
    await sheetA.getByRole("button", { name: "Fermer" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.waitForLoadState("networkidle");
    expect(cspErrors, "aucune violation CSP à l'ouverture des sheets").toEqual([]);
  });

  test("titre compact dans l'en-tête quand le grand titre défile hors de vue", async ({ page }) => {
    await page.goto("/dev/ui");
    const compact = page.getByTestId("header-compact-title");
    await expect(compact).toHaveCSS("opacity", "0");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(compact).toHaveText("Galerie UI");
    await expect(compact).toHaveCSS("opacity", "1");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(compact).toHaveCSS("opacity", "0");
  });

  test("barre d'onglets : trois onglets, cibles ≥ 44 px", async ({ page }) => {
    await page.goto("/dev/ui");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveCount(3);
    for (const link of await nav.getByRole("link").all()) {
      expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("P2-A · A4 — écrans (données fictives de galerie)", () => {
  for (const colorScheme of ["dark", "light"] as const) {
    test(`Accueil et Profil : accessibilité, CSP, sheet — ${colorScheme}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      const cspErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && /Content Security Policy|CSP/i.test(msg.text())) cspErrors.push(msg.text());
      });
      for (const screen of ["home", "profile"]) {
        await page.goto(`/dev/ui/screens/${screen}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(screen === "home" ? "Accueil" : "Profil");
        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
        expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`), screen).toEqual([]);
        await testInfo.attach(`${screen}-${colorScheme}-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
      }
      // Édition en sheet : panneau court, une action, fermeture.
      await page.getByRole("button", { name: /^Présentation/ }).click();
      const sheet = page.getByRole("dialog", { name: "Présentation" });
      await expect(sheet.getByLabel("Ta présentation")).toHaveValue("Exemple de présentation fictive pour la galerie.");
      await testInfo.attach(`profile-sheet-${colorScheme}-${testInfo.project.name}`, { body: await page.screenshot(), contentType: "image/png" });
      await sheet.getByRole("button", { name: "Fermer" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.waitForLoadState("networkidle");
      expect(cspErrors).toEqual([]);
    });
  }

  // La fermeture de la sheet après un enregistrement réel est vérifiée par profile.spec (Supabase, CI).
  test("Profil : confirmation d'enregistrement affichée, aucune sheet ouverte", async ({ page }) => {
    await page.goto("/dev/ui/screens/profile?saved=presentation");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Présentation enregistrée." })).toBeVisible();
  });
});
