import { expect, test, type Page } from "@playwright/test";
import {
  authCookies,
  createConfirmedUser,
  login,
  qaEmail,
  serverBroadcast,
  waitForEmailLink,
  PASSWORD,
} from "./helpers/supabase";

/** Collecte les violations CSP signalées en console (une page cassée par la CSP doit faire échouer le test). */
function trackCspViolations(page: Page, sink: string[]) {
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy|violates the following/i.test(msg.text())) sink.push(msg.text());
  });
}

/**
 * Spike S-1.4a — ADR-0002 scénarios A1–A8 (Supabase local, CI).
 * En CI : jwt_expiry = 120 s (config locale modifiée dans le job uniquement).
 */

test.describe("ADR-0002 — spike d'authentification", () => {
  test("accès anonyme à une page privée → redirection vers la connexion avec retour interne", async ({ page }) => {
    await page.goto("/spike/session");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)spike(%2F|\/)session$/);
  });

  test("A1 + A2 + A3 + A4 — expiration du jeton : serveur, client, deux onglets, Realtime privé", async ({ browser }) => {
    test.setTimeout(240_000);
    const user = await createConfirmedUser();

    const cspViolations: string[] = [];
    const ctxA = await browser.newContext();
    const tab1 = await ctxA.newPage();
    trackCspViolations(tab1, cspViolations);
    await login(tab1, user.email);
    const tab2 = await ctxA.newPage();
    trackCspViolations(tab2, cspViolations);
    await tab2.goto("/spike/session");
    await expect(tab2.getByTestId("server-sub")).toHaveText(user.id);

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    trackCspViolations(pageB, cspViolations);
    await login(pageB, user.email);

    // Realtime : canal personnel autorisé, canal d'autrui refusé (P8).
    for (const p of [tab1, pageB]) await expect(p.getByTestId("realtime-own-status")).toHaveText("SUBSCRIBED", { timeout: 20_000 });
    await expect(tab1.getByTestId("realtime-foreign-status")).toHaveText("CHANNEL_ERROR", { timeout: 20_000 });

    const expBefore = Number(await tab1.getByTestId("server-exp").textContent());
    const tokenBefore = (await authCookies(tab1)).map((c) => c.value).join("");
    const waitMs = expBefore * 1000 - Date.now() + 5_000;
    test.info().annotations.push({ type: "attente", description: `${Math.round(waitMs / 1000)} s jusqu'à expiration + 5 s` });
    await tab1.waitForTimeout(Math.max(waitMs, 0));

    // A1 + A3 : deux onglets rechargent en parallèle avec un jeton expiré.
    await Promise.all([tab1.reload(), tab2.reload()]);
    for (const p of [tab1, tab2]) await expect(p.getByTestId("server-sub")).toHaveText(user.id);
    const expAfter = Number(await tab1.getByTestId("server-exp").textContent());
    expect(expAfter, "A1 — nouveau jeton émis côté serveur").toBeGreaterThan(expBefore);
    const tokenAfter = (await authCookies(tab1)).map((c) => c.value).join("");
    expect(tokenAfter, "A1 — cookies de session réécrits").not.toBe(tokenBefore);

    // A2 : action côté client sans navigation après expiration.
    await pageB.getByRole("button", { name: "Vérifier la session côté client" }).click();
    await expect(pageB.getByTestId("client-check")).toHaveText(new RegExp(`^valid:${user.id}:\\d+$`));
    const clientExp = Number((await pageB.getByTestId("client-check").textContent())!.split(":")[2]);
    expect(clientExp, "A2 — jeton rafraîchi côté client").toBeGreaterThan(expBefore);

    // A4 : Realtime privé toujours autorisé après rafraîchissement (nouvel abonnement et abonnement existant).
    await expect(tab1.getByTestId("realtime-own-status")).toHaveText("SUBSCRIBED", { timeout: 20_000 });
    await serverBroadcast(`user:${user.id}`, "spike", { n: 1 });
    await expect(tab1.getByTestId("realtime-received")).toHaveText("1", { timeout: 15_000 });
    await expect(pageB.getByTestId("realtime-received")).not.toHaveText("0", { timeout: 15_000 });

    expect(cspViolations, "aucune violation CSP pendant le scénario").toEqual([]);
    await ctxA.close();
    await ctxB.close();
  });

  test("A5a — déconnexion globale ailleurs : refresh révoqué, action sensible refusée dès l'expiration du jeton", async ({ browser }) => {
    test.setTimeout(240_000);
    const user = await createConfirmedUser();
    const ctxX = await browser.newContext();
    const ctxY = await browser.newContext();
    const pageX = await ctxX.newPage();
    const pageY = await ctxY.newPage();
    await login(pageX, user.email);
    await login(pageY, user.email);
    const expY = Number(await pageY.getByTestId("server-exp").textContent());
    expect(Number.isFinite(expY), "exp du JWT lisible").toBe(true);

    await pageY.getByRole("button", { name: "Action sensible" }).click();
    await expect(pageY.getByTestId("sensitive-result")).toHaveText("ok");

    await pageX.getByRole("button", { name: "Se déconnecter partout" }).click();
    await expect(pageX).toHaveURL(/\/login/);

    // Constat (non bloquant, voir A5b) : résultat immédiat tant que le JWT de Y est valide.
    await pageY.getByRole("button", { name: "Action sensible" }).click();
    await expect(pageY.getByTestId("sensitive-result")).toHaveText(/^(ok|refused)$/);
    test.info().annotations.push({
      type: "A5-immédiat",
      description: `résultat immédiat après révocation globale : ${await pageY.getByTestId("sensitive-result").textContent()}`,
    });

    // Garantie de la plateforme : le refresh token est révoqué ; à l'expiration du JWT, plus aucun accès.
    await pageY.waitForTimeout(Math.max(expY * 1000 - Date.now() + 5_000, 0));
    // Pendant l'attente, le client navigateur de Y a pu tenter un rafraîchissement (refusé) et se déconnecter :
    // on consigne l'état réel de la page avant d'agir, au lieu de cliquer sur un bouton disparu.
    const sensitiveButton = pageY.getByRole("button", { name: "Action sensible" });
    const stillOnPage = await sensitiveButton.isVisible();
    test.info().annotations.push({ type: "A5-après-expiration", description: `url=${pageY.url()} · bouton visible=${stillOnPage}` });
    if (stillOnPage) {
      await sensitiveButton.click();
      await expect(pageY.getByTestId("sensitive-result").or(pageY.getByRole("heading", { name: "Connexion" }))).toBeVisible();
      if (await pageY.getByTestId("sensitive-result").isVisible()) {
        await expect(pageY.getByTestId("sensitive-result")).toHaveText("refused");
      }
    }
    // Preuve stricte, dans tous les cas : la page privée n'est plus accessible.
    await pageY.goto("/spike/session");
    await expect(pageY).toHaveURL(/\/login\?next=(%2F|\/)spike(%2F|\/)session$/);

    await ctxX.close();
    await ctxY.close();
  });

  test(
    "A5b — révocation IMMÉDIATE pour les actions sensibles (D-40 : contrôle de session active côté base)",
    async ({ browser }) => {
      // Supabase : « Access Tokens of revoked sessions remain valid until their expiry time ».
      // D-40 : l'action sensible appelle api.assert_session_active() → refus immédiat malgré un JWT encore valide.
      const user = await createConfirmedUser();
      const ctxX = await browser.newContext();
      const ctxY = await browser.newContext();
      const pageX = await ctxX.newPage();
      const pageY = await ctxY.newPage();
      await login(pageX, user.email);
      await login(pageY, user.email);
      // Garde-fou contre un faux succès : tant que la session est active, l'action sensible passe.
      await pageY.getByRole("button", { name: "Action sensible" }).click();
      await expect(pageY.getByTestId("sensitive-result")).toHaveText("ok");
      const expY = Number(await pageY.getByTestId("server-exp").textContent());
      await pageX.getByRole("button", { name: "Se déconnecter partout" }).click();
      await expect(pageX).toHaveURL(/\/login/);
      await pageY.getByRole("button", { name: "Action sensible" }).click();
      await expect(pageY.getByTestId("sensitive-result")).toHaveText("refused");
      // Preuve que le refus est immédiat : le JWT de Y n'avait pas encore expiré.
      expect(Date.now() / 1000, "JWT de Y encore valide au moment du refus").toBeLessThan(expY);
      await ctxX.close();
      await ctxY.close();
    },
  );

  test("A6 — inscription + confirmation d'email (PKCE) puis session établie", async ({ page }) => {
    const email = qaEmail();
    await page.goto("/signup?next=/spike/session");
    await page.getByLabel("Adresse email").fill(email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("status")).toBeVisible();

    const link = await waitForEmailLink(email);
    await page.goto(link);
    await expect(page).toHaveURL(/\/spike\/session$/);
    await expect(page.getByTestId("server-sub")).toBeVisible();
  });

  test("A6 — retour OAuth Google", async () => {
    test.skip(true, "NON EXÉCUTABLE en CI : requiert un vrai client Google (Vercel Preview + Google Cloud). Réserve ADR-0002 maintenue.");
  });

  test("A7 — en-têtes anti-cache sur les réponses authentifiées", async ({ page }) => {
    const user = await createConfirmedUser();
    await login(page, user.email);
    const res = await page.request.get("/spike/session");
    expect(res.status()).toBe(200);
    const cacheControl = res.headers()["cache-control"] ?? "";
    test.info().annotations.push({ type: "A7-cache-control", description: cacheControl });
    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
  });

  test("A8 — relevé des attributs réels des cookies de session", async ({ page }) => {
    const user = await createConfirmedUser();
    await login(page, user.email);
    const cookies = await authCookies(page);
    expect(cookies.length).toBeGreaterThan(0);
    const summary = cookies.map((c) => ({
      name: c.name.replace(/^sb-[^-]+-/, "sb-<ref>-"),
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
      path: c.path,
      maxAgeDays: c.expires > 0 ? Math.round((c.expires - Date.now() / 1000) / 86400) : "session",
    }));
    test.info().annotations.push({ type: "A8-cookies", description: JSON.stringify(summary) });
    for (const c of cookies) {
      expect(c.sameSite).toBe("Lax");
      expect(c.httpOnly).toBe(false); // ADR-0002 v3 : lisibles par le client navigateur
      expect(c.path).toBe("/");
    }
  });
});
