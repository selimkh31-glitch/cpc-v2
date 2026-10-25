import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicEnv, sessionCookieOptions } from "./env";

/**
 * Client Supabase serveur (Server Components, Server Actions, Route Handlers).
 * Un client par requête, jamais partagé (ADR-0002). JWT de l'utilisateur : la RLS s'applique.
 */
export async function createSupabaseServerClient() {
  const env = requireSupabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient(env.url, env.publishableKey, {
    cookieOptions: sessionCookieOptions(env.siteUrl),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Appel depuis un Server Component : écriture impossible, le proxy rafraîchit la session.
        }
      },
    },
  });
}
