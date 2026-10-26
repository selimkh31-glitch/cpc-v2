import { expect, test } from "@playwright/test";
import { signIn, storage, TINY_PNG, url } from "./helpers";

/**
 * G2 — Storage entre utilisateurs, sur le staging (ADR-0015 S1, S4, S5, S7, S8 ; A-1 appliquée).
 * S2/S3 (blocages) et S6 (blasons) restent non exécutables tant que ces fonctionnalités n'existent pas.
 * Chaque objet créé est supprimé en fin de test.
 */
test.skip(process.env.E2E_TARGET !== "staging", "Réservé au workflow manuel staging-http.");
test.describe.configure({ mode: "serial" });

test("ST1 à ST6 — avatars privés : isolation, formats, URL signées, suppression", async () => {
  const a = await signIn("QA_A");
  const b = await signIn("QA_B");
  const pathA = `${a.userId}/${crypto.randomUUID()}.png`;
  const created: string[] = [];
  try {
    // A dépose dans son dossier.
    const up = await storage(`/object/avatars/${pathA}`, { method: "POST", token: a.token, headers: { "Content-Type": "image/png" }, body: TINY_PNG });
    expect(up.status, "ST1 dépôt propriétaire").toBe(200);
    created.push(pathA);

    // S5 : B ne peut ni écrire chez A, ni remplacer, ni supprimer l'objet de A.
    const intrusion = await storage(`/object/avatars/${a.userId}/${crypto.randomUUID()}.png`, { method: "POST", token: b.token, headers: { "Content-Type": "image/png" }, body: TINY_PNG });
    expect(intrusion.status, "ST2 S5 écriture chez autrui").toBeGreaterThanOrEqual(400);
    const overwrite = await storage(`/object/avatars/${pathA}`, { method: "PUT", token: b.token, headers: { "Content-Type": "image/png" }, body: TINY_PNG });
    expect(overwrite.status, "ST2 S5 remplacement par autrui").toBeGreaterThanOrEqual(400);
    const del = await storage(`/object/avatars`, { method: "DELETE", token: b.token, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [pathA] }) });
    const deleted = del.status < 300 ? ((await del.json()) as unknown[]).length : 0;
    expect(deleted, "ST2 S5 suppression par autrui").toBe(0);

    // S7 : SVG et nom non conforme refusés.
    const svg = await storage(`/object/avatars/${a.userId}/${crypto.randomUUID()}.png`, { method: "POST", token: a.token, headers: { "Content-Type": "image/svg+xml" }, body: "<svg/>" });
    expect(svg.status, "ST3 S7 SVG").toBeGreaterThanOrEqual(400);
    const badName = await storage(`/object/avatars/${a.userId}/mon-avatar.png`, { method: "POST", token: a.token, headers: { "Content-Type": "image/png" }, body: TINY_PNG });
    expect(badName.status, "ST3 nom non UUID").toBeGreaterThanOrEqual(400);

    // S1 : anonyme ni objet, ni URL publique.
    expect((await storage(`/object/authenticated/avatars/${pathA}`)).status, "ST4 S1 objet anonyme").toBeGreaterThanOrEqual(400);
    expect((await storage(`/object/public/avatars/${pathA}`)).status, "ST4 S1 bucket non public").toBeGreaterThanOrEqual(400);

    // B (profil visible) peut obtenir une URL signée de l'avatar de A ; elle expire (S4).
    const sign = await storage(`/object/sign/avatars/${pathA}`, { method: "POST", token: b.token, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3 }) });
    expect(sign.status, "ST5 signature par un membre").toBe(200);
    const signed = `${url()}/storage/v1${((await sign.json()) as { signedURL: string }).signedURL}`;
    expect((await fetch(signed)).status, "ST5 URL fraîche").toBe(200);
    await new Promise((r) => setTimeout(r, 4_500));
    expect((await fetch(signed)).status, "ST5 S4 URL expirée").toBeGreaterThanOrEqual(400);

    // S8 : objet supprimé par son propriétaire → URL encore dans son TTL refusée.
    const sign2 = await storage(`/object/sign/avatars/${pathA}`, { method: "POST", token: a.token, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 600 }) });
    const signed2 = `${url()}/storage/v1${((await sign2.json()) as { signedURL: string }).signedURL}`;
    const own = await storage(`/object/avatars`, { method: "DELETE", token: a.token, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [pathA] }) });
    expect(own.status, "ST6 suppression propriétaire").toBe(200);
    created.splice(0);
    expect((await fetch(signed2)).status, "ST6 S8 objet supprimé").toBeGreaterThanOrEqual(400);
  } finally {
    if (created.length) await storage(`/object/avatars`, { method: "DELETE", token: a.token, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: created }) });
  }
});
