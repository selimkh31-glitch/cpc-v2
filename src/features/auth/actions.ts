"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/auth/redirect";
import { credentialsSchema, emailSchema, passwordSchema } from "./schemas";

const DEFAULT_AFTER_LOGIN = "/home";

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
 * Action « sensible » du spike (A5) — D-40 :
 * 1. getUser() : utilisateur existant et non banni (ne détecte PAS une session révoquée avant l'exp du JWT) ;
 * 2. api.assert_session_active() : la session du JWT existe encore dans auth.sessions → refus immédiat
 *    après une déconnexion globale, même si le JWT n'a pas expiré.
 */
export async function sensitiveCheckAction(): Promise<"ok" | "refused"> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return "refused";
  const { data: active, error: rpcError } = await supabase.schema("api").rpc("assert_session_active");
  return !rpcError && active === true ? "ok" : "refused";
}

/** Récupération de compte (AUTH-01) : même réponse que l'adresse existe ou non (pas d'énumération). */
export async function requestPasswordResetAction(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (parsed.success) {
    const { siteUrl } = requireSupabasePublicEnv();
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
  }
  redirect("/forgot-password?sent=1");
}

/** Nouveau mot de passe après lien de récupération (session fraîche établie par /auth/callback). */
export async function updatePasswordAction(formData: FormData) {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) redirect("/reset-password?error=invalid");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/reset-password");
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) redirect("/reset-password?error=invalid");
  redirect("/home");
}
