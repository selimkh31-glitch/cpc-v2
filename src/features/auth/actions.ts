"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/auth/redirect";
import { credentialsSchema } from "./schemas";

const DEFAULT_AFTER_LOGIN = "/spike/session";

function withNext(path: string, next: string) {
  return `${path}${path.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}`;
}

export async function signInAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  const next = safeNextPath(formData.get("next"), DEFAULT_AFTER_LOGIN);
  if (!parsed.success) redirect(withNext("/login?error=invalid", next));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // Message générique : ne révèle ni l'existence du compte ni la cause exacte.
  if (error) redirect(withNext("/login?error=invalid", next));
  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  const next = safeNextPath(formData.get("next"), DEFAULT_AFTER_LOGIN);
  if (!parsed.success) redirect(withNext("/signup?error=invalid", next));

  const { siteUrl } = requireSupabasePublicEnv();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  // Même réponse que le compte existe ou non (pas d'énumération).
  redirect("/signup?sent=1");
}

export async function signOutAction(formData: FormData) {
  const scope = formData.get("scope") === "global" ? "global" : "local";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope });
  redirect("/login");
}

/**
 * Action « sensible » du spike (A5) : getUser() interroge le serveur Auth et détecte
 * une session révoquée ailleurs, contrairement à getClaims() (vérification locale du JWT).
 */
export async function sensitiveCheckAction(): Promise<"ok" | "refused"> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user ? "ok" : "refused";
}
