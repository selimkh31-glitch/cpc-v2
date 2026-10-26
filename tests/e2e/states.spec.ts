import { expect, test } from "@playwright/test";
import { createOnboardedUser, login } from "./helpers/supabase";

/** S-1.8 — kit d'états UX (cahier UX §12). Supabase local, CI. */
test.describe("S-1.8 — états transversaux", () => {
  test("hors ligne : bandeau explicite, puis disparition au retour du réseau", async ({ page, context }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    await page.goto("/home");
    const banner = page.locator('[data-state="offline"]');
    await expect(banner).toHaveCount(0);
    await context.setOffline(true);
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("role", "status");
    await context.setOffline(false);
    await expect(banner).toHaveCount(0);
  });

  test("page introuvable : 404, message en français et retour à l'accueil", async ({ page }) => {
    const res = await page.goto("/page-qui-n-existe-pas");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page introuvable");
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/home");
  });
});
