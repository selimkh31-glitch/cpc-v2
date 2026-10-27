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
