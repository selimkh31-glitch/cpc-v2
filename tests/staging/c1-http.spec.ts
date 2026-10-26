import { expect, test } from "@playwright/test";
import { rest, signIn, signOut } from "./helpers";

/**
 * G2 — contrôles HTTP réels sur le staging (C-1 : schéma api exposé). Exécution manuelle uniquement
 * (workflow « staging-http »). Comptes A et B : synthétiques, onboardés.
 */
test.skip(process.env.E2E_TARGET !== "staging", "Réservé au workflow manuel staging-http.");
test.describe.configure({ mode: "serial" });

test("H1 — anonyme : aucune fonction api, aucune table privée", async () => {
  const rpc = await rest("/rpc/assert_session_active", { method: "POST", schema: "api", body: "{}" });
  test.info().annotations.push({ type: "H1-rpc-anon", description: String(rpc.status) });
  expect([401, 403]).toContain(rpc.status);
  const onboarding = await rest("/rpc/complete_onboarding", { method: "POST", schema: "api", body: "{}" });
  expect([401, 403]).toContain(onboarding.status);
  const settings = await rest("/account_settings?select=profile_id");
  expect([401, 403]).toContain(settings.status);
  // Fonction de plateforme durcie (D-38) : non appelable.
  const rae = await rest("/rpc/rls_auto_enable", { method: "POST", body: "{}" });
  expect(rae.status).toBeGreaterThanOrEqual(400);
});

test("H2 — schéma private jamais exposé", async () => {
  const a = await signIn("QA_A");
  const res = await rest("/rpc/session_is_active", { method: "POST", schema: "private", token: a.token, body: "{}" });
  test.info().annotations.push({ type: "H2-private", description: String(res.status) });
  expect(res.status).toBeGreaterThanOrEqual(400);
});

test("H3 — isolation de deux utilisateurs authentifiés", async () => {
  const a = await signIn("QA_A");
  const b = await signIn("QA_B");
  // Paramètres privés : chacun ne voit que les siens.
  const own = await rest("/account_settings?select=profile_id", { token: a.token });
  expect(own.status).toBe(200);
  const rows = (await own.json()) as { profile_id: string }[];
  expect(rows.map((r) => r.profile_id)).toEqual([a.userId]);
  // Lecture du profil public de B autorisée (membres authentifiés) ; écriture refusée (0 ligne).
  const readB = await rest(`/profiles?id=eq.${b.userId}&select=id,handle`, { token: a.token });
  expect(((await readB.json()) as unknown[]).length).toBe(1);
  const patch = await rest(`/profiles?id=eq.${b.userId}`, { method: "PATCH", token: a.token, body: JSON.stringify({ bio: "idor" }), headers: { Prefer: "return=representation" } });
  expect(((await patch.json()) as unknown[]).length, "IDOR sur le profil de B").toBe(0);
  const patchSettings = await rest(`/account_settings?profile_id=eq.${b.userId}`, { method: "PATCH", token: a.token, body: JSON.stringify({ marketing_opt_in: true }), headers: { Prefer: "return=representation" } });
  expect(((await patchSettings.json()) as unknown[]).length, "IDOR sur les paramètres de B").toBe(0);
  // Écritures directes interdites (création réservée à la commande).
  const insert = await rest("/profiles", { method: "POST", token: a.token, body: JSON.stringify({ id: a.userId, handle: "qa_x", platform: "pc", main_position: "ST" }) });
  expect(insert.status).toBeGreaterThanOrEqual(400);
  const handle = await rest(`/profiles?id=eq.${a.userId}`, { method: "PATCH", token: a.token, body: JSON.stringify({ handle: "qa_hack" }) });
  expect(handle.status, "pseudo non modifiable directement").toBeGreaterThanOrEqual(400);
});

test("H4 — complete_onboarding via HTTP : compte déjà onboardé → ALREADY_HANDLED (aucune double création)", async () => {
  const a = await signIn("QA_A");
  const again = await rest("/rpc/complete_onboarding", {
    method: "POST", schema: "api", token: a.token,
    body: JSON.stringify({ p_request_id: crypto.randomUUID(), p_handle: "qa_autre", p_platform: "pc", p_main_position: "ST", p_secondary_positions: [], p_age_confirmed: true }),
  });
  expect(again.status).toBeGreaterThanOrEqual(400);
  expect(((await again.json()) as { message?: string }).message).toBe("ALREADY_HANDLED");
});

test("H5 — D-40 : action sensible acceptée avec une session active, refusée immédiatement après déconnexion globale", async () => {
  const a = await signIn("QA_A");
  const ok = await rest("/rpc/assert_session_active", { method: "POST", schema: "api", token: a.token, body: "{}" });
  expect(ok.status).toBe(200);
  expect(await ok.json()).toBe(true);
  const exp = (JSON.parse(Buffer.from(a.token.split(".")[1] ?? "", "base64url").toString()) as { exp: number }).exp;
  const out = await signOut(a, "global");
  expect(out.status).toBeLessThan(300);
  const after = await rest("/rpc/assert_session_active", { method: "POST", schema: "api", token: a.token, body: "{}" });
  // Même JWT, encore valide : la base refuse (false) — ou PostgREST refuse le jeton (4xx).
  const refused = after.status >= 400 || (await after.json()) === false;
  test.info().annotations.push({ type: "H5-après-révocation", description: `HTTP ${after.status}` });
  expect(refused, "révocation immédiate").toBe(true);
  expect(Date.now() / 1000, "JWT encore valide au moment du refus").toBeLessThan(exp);
});
