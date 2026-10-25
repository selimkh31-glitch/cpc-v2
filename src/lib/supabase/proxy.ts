import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { getSupabasePublicEnv, sessionCookieOptions } from "./env";

export type PendingAuthWrites = {
  cookies: { name: string; value: string; options: CookieOptions }[];
  headers: Record<string, string>;
};

/**
 * Rafraîchit la session Supabase dans le proxy (ADR-0002).
 * Met à jour les cookies de la requête (pour les Server Components) et renvoie les écritures
 * à appliquer sur la réponse (Set-Cookie + en-têtes anti-cache fournis par la lib).
 * Aucune logique entre la création du client et getClaims().
 */
export async function refreshSession(request: NextRequest): Promise<PendingAuthWrites> {
  const pending: PendingAuthWrites = { cookies: [], headers: {} };
  const env = getSupabasePublicEnv();
  if (!env) return pending;

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookieOptions: sessionCookieOptions(env.siteUrl),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        pending.cookies.push(...cookiesToSet);
        Object.assign(pending.headers, headers);
      },
    },
  });
  await supabase.auth.getClaims();
  return pending;
}
