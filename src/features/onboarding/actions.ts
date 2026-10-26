"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseOnboardingForm } from "./schemas";

const KNOWN_ERRORS = new Set(["VALIDATION", "CONFLICT", "ALREADY_HANDLED", "UNAUTHENTICATED"]);

/** S-1.6 : appelle la commande api.complete_onboarding ; succès affiché seulement après confirmation serveur (UX-02). */
export async function completeOnboardingAction(formData: FormData) {
  const parsed = parseOnboardingForm(formData);
  if (!parsed.success) redirect("/onboarding?error=VALIDATION");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema("api").rpc("complete_onboarding", {
    p_request_id: parsed.data.requestId,
    p_handle: parsed.data.handle,
    p_platform: parsed.data.platform,
    p_main_position: parsed.data.mainPosition,
    p_secondary_positions: parsed.data.secondaryPositions,
    p_age_confirmed: parsed.data.ageConfirmed,
  });
  if (error) {
    if (error.message === "ALREADY_HANDLED") redirect("/home");
    if (error.message === "UNAUTHENTICATED") redirect("/login?next=/onboarding");
    redirect(`/onboarding?error=${KNOWN_ERRORS.has(error.message) ? error.message : "UNKNOWN"}`);
  }
  redirect("/home");
}
