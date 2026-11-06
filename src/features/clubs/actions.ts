"use server";

import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rpcErrorCode } from "@/lib/errors/rpc";
import {
  createClubInputSchema,
  createClubResultSchema,
  createClubRpcArgs,
  updateClubInputSchema,
  updateClubResultSchema,
  updateClubRpcArgs,
} from "@/features/clubs/contract";

function strings(form: FormData, key: string): string[] {
  return form.getAll(key).filter((item): item is string => typeof item === "string");
}
function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
function booleanChoice(value: string): boolean | null {
  return value === "true" ? true : value === "false" ? false : null;
}

/** Création du club : validation Zod + commande SQL atomique, sans droits serveur élargis. */
export async function createClubAction(form: FormData): Promise<never> {
  await requireOnboardedUser("/clubs/new");
  const parsed = createClubInputSchema.safeParse({
    requestId: text(form, "requestId"),
    name: text(form, "name"),
    description: text(form, "description"),
    platform: text(form, "platform"),
    languages: strings(form, "languages"),
    level: text(form, "level"),
    recruitingOpen: booleanChoice(text(form, "recruitingOpen")),
    recruitingPositions: strings(form, "recruitingPositions"),
  });
  if (!parsed.success) redirect("/clubs/new?error=VALIDATION");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema("api").rpc("create_club", createClubRpcArgs(parsed.data));
  if (error) redirect("/clubs/new?error=" + rpcErrorCode(error));
  const result = createClubResultSchema.safeParse(data);
  if (!result.success) redirect("/clubs/new?error=UNKNOWN");
  redirect("/clubs/" + encodeURIComponent(result.data.data.club_id));
}

/** Modification d'un club : le backend vérifie le rôle sur ce club, même si le formulaire est forgé. */
export async function updateClubAction(form: FormData): Promise<never> {
  await requireOnboardedUser("/clubs");
  const id = text(form, "clubId");
  const url = "/clubs/" + encodeURIComponent(id) + "/manage/settings";
  const parsed = updateClubInputSchema.safeParse({
    requestId: text(form, "requestId"),
    clubId: id,
    expectedUpdatedAt: text(form, "expectedUpdatedAt"),
    description: text(form, "description"),
    languages: strings(form, "languages"),
    level: text(form, "level"),
    recruitingOpen: booleanChoice(text(form, "recruitingOpen")),
    recruitingPositions: strings(form, "recruitingPositions"),
  });
  if (!parsed.success) redirect(url + "?error=VALIDATION");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema("api").rpc("update_club", updateClubRpcArgs(parsed.data));
  if (error) redirect(url + "?error=" + rpcErrorCode(error));
  if (!updateClubResultSchema.safeParse(data).success) redirect(url + "?error=UNKNOWN");
  redirect("/clubs/" + encodeURIComponent(id) + "?saved=settings");
}
