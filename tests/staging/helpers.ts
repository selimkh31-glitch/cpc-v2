import { expect } from "@playwright/test";

/**
 * Tests HTTP contre le STAGING (G2) — aucun secret dans Git.
 * Variables (secrets GitHub du workflow manuel « staging-http », jamais commités) :
 *   STAGING_SUPABASE_URL, STAGING_PUBLISHABLE_KEY (clé publique, gardée hors Git par sobriété),
 *   QA_A_EMAIL / QA_A_PASSWORD, QA_B_EMAIL / QA_B_PASSWORD : comptes synthétiques qa_*@example.test,
 *   confirmés et onboardés sur le staging.
 */
export const STAGING_REF_URL = "https://cglbsllwdmluvbisozyx.supabase.co";

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Variable manquante : ${name}`);
  return v;
};

export const url = () => {
  // Même normalisation que le garde-fou du workflow : espaces et « / » final retirés.
  const u = env("STAGING_SUPABASE_URL").replace(/\s+/g, "").replace(/\/+$/, "");
  // Garde-fou : ces tests ne visent QUE le staging CPC V2.
  if (u !== STAGING_REF_URL) throw new Error(`Cible refusée : ${u} (seul le staging CPC V2 est autorisé).`);
  return u;
};
export const apikey = () => env("STAGING_PUBLISHABLE_KEY").trim();

export type QaUser = { email: string; token: string; userId: string; sessionId: string };

/** Connexion par mot de passe (Auth REST) : jeton porteur du session_id réel. */
export async function signIn(prefix: "QA_A" | "QA_B"): Promise<QaUser> {
  const email = env(`${prefix}_EMAIL`).trim();
  expect(email.endsWith("@example.test"), "compte synthétique uniquement").toBe(true);
  const res = await fetch(`${url()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: apikey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: env(`${prefix}_PASSWORD`).trim() }),
  });
  expect(res.status, `connexion ${prefix}`).toBe(200);
  const body = (await res.json()) as { access_token: string; user: { id: string } };
  const payload = JSON.parse(Buffer.from(body.access_token.split(".")[1] ?? "", "base64url").toString()) as { session_id: string };
  return { email, token: body.access_token, userId: body.user.id, sessionId: payload.session_id };
}

export async function signOut(user: QaUser, scope: "global" | "local" = "local") {
  return fetch(`${url()}/auth/v1/logout?scope=${scope}`, {
    method: "POST",
    headers: { apikey: apikey(), Authorization: `Bearer ${user.token}` },
  });
}

/** Appel PostgREST (schéma choisi via Accept-Profile / Content-Profile). */
export async function rest(path: string, init: RequestInit & { token?: string; schema?: string } = {}) {
  const { token, schema = "public", headers, ...rest } = init;
  const method = (rest.method ?? "GET").toUpperCase();
  return fetch(`${url()}/rest/v1${path}`, {
    ...rest,
    headers: {
      apikey: apikey(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === "GET" || method === "HEAD" ? { "Accept-Profile": schema } : { "Content-Profile": schema, "Content-Type": "application/json" }),
      ...(headers ?? {}),
    },
  });
}

export async function storage(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, headers, ...rest } = init;
  return fetch(`${url()}/storage/v1${path}`, {
    ...rest,
    headers: { apikey: apikey(), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers ?? {}) },
  });
}

export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
