import "server-only";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Garde serveur (ADR-0002) : à appeler dans chaque layout ET chaque page privée
 * (un layout n'est pas réévalué à chaque navigation client).
 * getClaims() vérifie la signature du JWT ; l'autorisation métier reste en base.
 */
export async function requireUser(nextPath: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return { userId: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

/** Garde « profil complété » (S-1.6) : sans profil, redirection vers l'onboarding. */
export async function requireOnboardedUser(nextPath: string) {
  const user = await requireUser(nextPath);
  if (!(await hasProfile(user.userId))) redirect("/onboarding");
  return user;
}

/** Lecture RLS de son propre profil (policy profiles_select_authenticated). */
export async function hasProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  return Boolean(data);
}

/**
 * Zone admin CPC (ADR-0002, T-14) : introuvable pour tout non-staff.
 * Tant qu'aucun rôle staff n'est lisible côté serveur (RPC dédiée à venir), la zone est fermée à tous.
 */
export async function requireStaff(): Promise<never> {
  notFound();
}
