import { expect, test } from "@playwright/test";

/** S-1.11 — pages légales provisoires et PWA (sans Supabase). */
test.describe("S-1.11 — pages légales provisoires et PWA", () => {
  for (const [doc, title] of [
    ["terms", "Conditions générales d'utilisation"],
    ["privacy", "Politique de confidentialité"],
    ["support", "Aide et contact"],
  ] as const) {
    test(`/legal/${doc} : accessible sans compte, marquée provisoire et non contractuelle`, async ({ page }) => {
      const res = await page.goto(`/legal/${doc}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.getByTestId("legal-draft")).toHaveText(/provisoire/i);
      await expect(page.getByRole("note")).toContainText("sans valeur contractuelle");
      // Non indexée tant que le texte n'est pas définitif.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });
  }

  test("document légal inconnu → 404", async ({ page }) => {
    const res = await page.goto("/legal/autre");
    expect(res?.status()).toBe(404);
  });

  test("manifest PWA valide, icônes servies, aucun service worker", async ({ page, request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest).toMatchObject({ name: "ClubPro Connect", short_name: "CPC", start_url: "/home", display: "standalone", lang: "fr" });
    for (const icon of manifest.icons as { src: string; purpose: string }[]) {
      const img = await request.get(icon.src);
      expect(img.status(), icon.src).toBe(200);
      expect(img.headers()["content-type"]).toContain("image/png");
    }
    expect((manifest.icons as { purpose: string }[]).some((i) => i.purpose === "maskable")).toBe(true);

    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    const registrations = await page.evaluate(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0));
    expect(registrations, "D-08 non validé : aucun service worker").toBe(0);
  });
});
