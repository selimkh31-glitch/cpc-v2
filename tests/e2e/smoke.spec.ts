import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Smoke — socle", () => {
  test("la page d'accueil se charge en français avec une CSP à nonce", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Content Security Policy|CSP/i.test(msg.text())) violations.push(msg.text());
    });

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ClubPro Connect");

    const headers = response!.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).not.toContain("unsafe-inline");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();

    // Les scripts Next portent bien le nonce (sinon la page serait cassée par la CSP).
    await page.waitForLoadState("networkidle");
    expect(violations).toEqual([]);
  });

  test("deux requêtes successives reçoivent des nonces différents", async ({ request }) => {
    const nonceOf = async () =>
      ((await request.get("/")).headers()["content-security-policy"] ?? "").match(/'nonce-([^']+)'/)?.[1];
    const [a, b] = [await nonceOf(), await nonceOf()];
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  test("aucune violation d'accessibilité critique ou sérieuse", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(blocking.map((v) => v.id)).toEqual([]);
  });
});
