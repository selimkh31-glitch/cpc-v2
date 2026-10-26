import { redirect } from "next/navigation";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ADR-0005 : `/home` est canonique ; `/` redirige selon la session (QA iPhone A-5).
 * getClaims() vérifie la signature du JWT (jamais getSession() pour décider côté serveur).
 * Les gardes de `/home` (connexion, onboarding) restent la seule autorité d'accès.
 */
export default async function RootPage() {
  if (!getSupabasePublicEnv()) redirect("/login");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  redirect(data?.claims?.sub ? "/home" : "/login");
}
