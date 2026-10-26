import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createConfirmedUser, createOnboardedUser, login } from "./helpers/supabase";

/** S-1.10 — accessibilité (cahier UX §12, WCAG 2.1 AA) sur toutes les pages existantes. Supabase local, CI. */
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function auditPage(page: Page, path: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(blocking.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`), `axe ${path}`).toEqual([]);

  // Cibles tactiles : boutons et champs ≥ 44 px de haut ; liens ≥ 24 px (WCAG 2.5.8).
  const sizes = await page.evaluate(() => {
    const out: { kind: string; label: string; h: number }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("button, input:not([type=hidden]), select, textarea, a[href]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || el.closest(".sr-only")) continue;
      const kind = el.tagName === "A" ? "link" : el.getAttribute("type") === "checkbox" || el.getAttribute("type") === "radio" ? "choice" : "control";
      out.push({ kind, label: (el.getAttribute("aria-label") ?? el.textContent ?? el.getAttribute("name") ?? "").trim().slice(0, 40), h: r.height });
    }
    return out;
  });
  for (const s of sizes) {
    // Cases et boutons radio : la zone cliquable est le libellé parent (min-h-11), contrôlée par axe ; seuil 20 px sur la case.
    const min = s.kind === "control" ? 44 : s.kind === "link" ? 24 : 20;
    expect(s.h, `${path} — « ${s.label} » (${s.kind})`).toBeGreaterThanOrEqual(min);
  }
}

test.describe("S-1.10 — accessibilité", () => {
  test("pages publiques et d'authentification", async ({ page }) => {
    for (const path of ["/", "/login", "/signup", "/forgot-password"]) {
      await page.goto(path);
      await auditPage(page, path);
    }
  });

  test("onboarding", async ({ page }) => {
    const user = await createConfirmedUser();
    await login(page, user.email);
    await page.goto("/onboarding");
    await auditPage(page, "/onboarding");
  });

  test("shell authentifié : Accueil, Explorer, Profil", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    for (const path of ["/home", "/explore", "/profile"]) {
      await page.goto(path);
      await auditPage(page, path);
    }
  });

  test("clavier : lien d'évitement en premier, focus visible", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    await page.goto("/home");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("réduction des animations respectée", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    const duration = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.transition = "opacity 1s";
      probe.style.animation = "none 2s";
      document.body.append(probe);
      const cs = getComputedStyle(probe);
      return { transition: cs.transitionDuration, animation: cs.animationDuration };
    });
    expect(Number.parseFloat(duration.transition)).toBeLessThan(0.01);
    expect(Number.parseFloat(duration.animation)).toBeLessThan(0.01);
  });
});
