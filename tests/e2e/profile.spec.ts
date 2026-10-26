import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createOnboardedUser, login, storageAsUser, TINY_PNG, userAccessToken, SUPABASE_URL } from "./helpers/supabase";

/** S-1.9 — profil et avatar privé (cahier UX §7, ADR-0015). Supabase local, CI. */
test.describe("S-1.9 — profil et avatar privé", () => {
  test("présentation et identifiant EA : enregistrements indépendants, EA déclaratif", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    await page.goto("/profile");
    await page.getByLabel("Ta présentation").fill("Milieu box-to-box, dispo le soir.");
    await page.getByRole("region", { name: "Présentation" }).getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/profile\?saved=presentation$/);
    await expect(page.getByRole("status").filter({ hasText: "Présentation enregistrée." })).toBeVisible();
    await expect(page.getByLabel("Ta présentation")).toHaveValue("Milieu box-to-box, dispo le soir.");

    await page.getByLabel("Gamertag EA").fill("QA_Gamertag");
    await page.getByRole("region", { name: "Identifiant EA" }).getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/profile\?saved=gamertag$/);
    await expect(page.getByLabel("Gamertag EA")).toHaveValue("QA_Gamertag");
    await expect(page.getByText("Déclaratif : il n'est pas vérifié par CPC.")).toBeVisible();
    // La présentation n'a pas été écrasée par l'autre panneau.
    await expect(page.getByLabel("Ta présentation")).toHaveValue("Milieu box-to-box, dispo le soir.");
  });

  test("avatar : dépôt PNG, affichage par URL signée, SVG refusé, retrait", async ({ page }) => {
    const user = await createOnboardedUser();
    await login(page, user.email);
    await page.goto("/profile");

    await page.getByLabel("Choisir une image").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: TINY_PNG });
    await page.getByRole("button", { name: "Envoyer l'avatar" }).click();
    await expect(page).toHaveURL(/\/profile\?saved=avatar$/);
    const img = page.getByTestId("profile-avatar");
    await expect(img).toBeVisible();
    const src = (await img.getAttribute("src")) ?? "";
    expect(src, "URL signée Storage").toContain("/storage/v1/object/sign/avatars/");
    expect(src).toContain("token=");
    expect((await page.request.get(src)).status(), "URL signée valide").toBe(200);

    // S7 : SVG déguisé en image refusé (signature réelle contrôlée côté serveur).
    await page.getByLabel("Choisir une image").setInputFiles({ name: "x.png", mimeType: "image/png", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>') });
    await page.getByRole("button", { name: "Envoyer l'avatar" }).click();
    await expect(page).toHaveURL(/\/profile\?error=avatar_type$/);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(/Format refusé/);

    // Retrait : l'ancien objet est supprimé, son URL signée devient inopérante (S8).
    await page.goto("/profile");
    await page.getByRole("button", { name: "Retirer l'avatar" }).click();
    await expect(page).toHaveURL(/\/profile\?saved=avatar_removed$/);
    await expect(page.getByTestId("profile-avatar")).toHaveCount(0);
    expect((await page.request.get(src)).status(), "S8 — objet supprimé : URL signée refusée").toBeGreaterThanOrEqual(400);
  });

  test("ADR-0015 S1, S4, S5, S7 via l'API Storage (JWT utilisateur)", async ({ request }) => {
    const a = await createOnboardedUser();
    const b = await createOnboardedUser();
    const tokenA = await userAccessToken(a.email);
    const tokenB = await userAccessToken(b.email);
    const pathA = `${a.id}/${randomUUID()}.png`;

    const up = await storageAsUser(tokenA, `/object/avatars/${pathA}`, { method: "POST", headers: { "Content-Type": "image/png" }, body: TINY_PNG });
    expect(up.status, "A dépose dans son dossier").toBe(200);

    // S5 : B ne peut pas écrire dans le dossier de A.
    const intrusion = await storageAsUser(tokenB, `/object/avatars/${a.id}/${randomUUID()}.png`, { method: "POST", headers: { "Content-Type": "image/png" }, body: TINY_PNG });
    expect(intrusion.status, "S5 — écriture de B chez A").toBeGreaterThanOrEqual(400);

    // S7 : SVG refusé par le bucket (MIME hors liste blanche).
    const svg = await storageAsUser(tokenA, `/object/avatars/${a.id}/${randomUUID()}.png`, { method: "POST", headers: { "Content-Type": "image/svg+xml" }, body: "<svg/>" });
    expect(svg.status, "S7 — SVG").toBeGreaterThanOrEqual(400);

    // S1 : anonyme — ni objet ni signature.
    const anonObject = await request.get(`${SUPABASE_URL()}/storage/v1/object/authenticated/avatars/${pathA}`);
    expect(anonObject.status(), "S1 — objet anonyme").toBeGreaterThanOrEqual(400);
    const anonPublic = await request.get(`${SUPABASE_URL()}/storage/v1/object/public/avatars/${pathA}`);
    expect(anonPublic.status(), "S1 — bucket non public").toBeGreaterThanOrEqual(400);

    // S4 : URL expirée → refus (TTL réduit à 2 s pour le test).
    const sign = await storageAsUser(tokenA, `/object/sign/avatars/${pathA}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 2 }) });
    expect(sign.status).toBe(200);
    const { signedURL } = (await sign.json()) as { signedURL: string };
    const signedUrl = `${SUPABASE_URL()}/storage/v1${signedURL}`;
    expect((await request.get(signedUrl)).status(), "URL fraîche").toBe(200);
    await new Promise((r) => setTimeout(r, 3_500));
    expect((await request.get(signedUrl)).status(), "S4 — URL expirée").toBeGreaterThanOrEqual(400);
  });
});
