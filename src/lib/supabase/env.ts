import { z } from "zod";

const schema = z.object({
  url: z.url(),
  publishableKey: z.string().min(20),
  siteUrl: z.url(),
});

export type SupabasePublicEnv = z.infer<typeof schema>;

/** Variables publiques Supabase (aucun secret). Renvoie null si Supabase n'est pas configuré. */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return schema.parse({
    url,
    publishableKey,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  });
}

export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const env = getSupabasePublicEnv();
  if (!env) throw new Error("Supabase non configuré : NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquants.");
  return env;
}

/**
 * ADR-0002 : options de cookies par défaut de @supabase/ssr (lisibles par le client navigateur,
 * SameSite=Lax), complétées par Secure dès que le site est servi en HTTPS (Preview, prod).
 */
export function sessionCookieOptions(siteUrl: string) {
  return { secure: siteUrl.startsWith("https://") };
}
