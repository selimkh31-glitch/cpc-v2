import { expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { randomUUID } from "node:crypto";

/**
 * Helpers e2e — Supabase LOCAL uniquement (clés de démonstration du CLI, jamais de secret réel).
 * Données 100 % synthétiques : qa_*@example.test.
 */
const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Variable e2e manquante : ${name}`);
  return v;
};

export const SUPABASE_URL = () => env("NEXT_PUBLIC_SUPABASE_URL");
if (process.env.NEXT_PUBLIC_SUPABASE_URL && !/^http:\/\/(127\.0\.0\.1|localhost):/.test(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  throw new Error("Les tests e2e d'authentification ne tournent que contre un Supabase local.");
}

export const PASSWORD = "QaPassword1234";

export function qaEmail() {
  return `qa_${randomUUID().slice(0, 12)}@example.test`;
}

export async function createConfirmedUser(email = qaEmail()) {
  const res = await fetch(`${SUPABASE_URL()}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: env("E2E_SUPABASE_SERVICE_KEY"),
      Authorization: `Bearer ${env("E2E_SUPABASE_SERVICE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  expect(res.ok, `création utilisateur qa : HTTP ${res.status}`).toBeTruthy();
  const body = (await res.json()) as { id: string };
  return { id: body.id, email };
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login?next=/spike/session");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByTestId("server-sub")).toBeVisible();
}

/** Émission côté serveur (comme un trigger) sur un canal privé. */
export async function serverBroadcast(topic: string, event: string, payload: Record<string, unknown>) {
  const client = new Client({ connectionString: env("E2E_DB_URL") });
  await client.connect();
  try {
    await client.query("select realtime.send($1::jsonb, $2, $3, true)", [JSON.stringify(payload), event, topic]);
  } finally {
    await client.end();
  }
}

type MailpitSummary = { ID: string; To: { Address: string }[]; Created: string };

export async function waitForEmailLink(to: string, timeoutMs = 30_000): Promise<string> {
  const base = env("E2E_MAILPIT_URL");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (await fetch(`${base}/api/v1/messages?limit=50`)).json()) as { messages: MailpitSummary[] };
    const msg = list.messages.find((m) => m.To.some((t) => t.Address.toLowerCase() === to.toLowerCase()));
    if (msg) {
      const full = (await (await fetch(`${base}/api/v1/message/${msg.ID}`)).json()) as { Text: string; HTML: string };
      const link = (full.Text + full.HTML).match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Aucun email de confirmation reçu pour ${to}`);
}

export async function authCookies(page: Page) {
  return (await page.context().cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name));
}

/** Utilisateur confirmé ET onboardé (profil + paramètres insérés via l'API REST locale avec la clé de démo service). */
export async function createOnboardedUser() {
  const user = await createConfirmedUser();
  const key = env("E2E_SUPABASE_SERVICE_KEY");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  const handle = `qa_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const p = await fetch(`${SUPABASE_URL()}/rest/v1/profiles`, {
    method: "POST", headers, body: JSON.stringify({ id: user.id, handle, platform: "pc", main_position: "ST" }),
  });
  expect(p.ok, `profil qa : HTTP ${p.status} ${await p.text()}`).toBeTruthy();
  const s = await fetch(`${SUPABASE_URL()}/rest/v1/account_settings`, {
    method: "POST", headers, body: JSON.stringify({ profile_id: user.id, age_confirmed_at: new Date().toISOString(), age_threshold: 18 }),
  });
  expect(s.ok, `paramètres qa : HTTP ${s.status} ${await s.text()}`).toBeTruthy();
  return { ...user, handle };
}
