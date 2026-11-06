"use server";

import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createClubInputSchema, createClubResultSchema, createClubRpcArgs,
  updateClubInputSchema, updateClubResultSchema, updateClubRpcArgs,
} from "./contract";

const CLUB_ERRORS = new Set(["VALIDATION", "CONFLICT", "LIMIT_REACHED", "RATE_LIMITED", "FORBIDDEN", "NOT_FOUND"]);
function safeCode(raw: string): string {
  return CLUB_ERRORS.has(raw) ? raw : "UNKNOWN";
}
function goNew(error: string): never {
  redirect("/clubs/new?error=" + safeCode(error));
}
function goSettings(id: string, error: string): never {
  redirect("/clubs/" + encodeURIComponent(id) + "/manage/settings?error=" + safeCode(error));
}
function text(form: FormData, name: string): string {
  const raw = form.get(name);
  return typeof raw === "string" ? raw : "";
}
function values(form: FormData, name: string): string[] {
  return form.getAll(name).filter((v): v is string => typeof v === "string");
}

/** Création transactionnelle : idempotence, OWNER et limites décidés en PostgreSQL. */
export async function createClubAction(formData: FormData): Promise<never> {
  await requireOnboardedUser("/clubs/new");
  const parsed = createClubInputSchema.safeParse({
    requestId: text(formData, "requestId"),
    name: text(formData, "name"),
    description: text(formData, "description"),
    platform: text(formData, "platform"),
    languages: values(formData, "languages"),
    level: text(formData, "level"),
    recruitingOpen: text(formData, "recruitingOpen") === "true",
    recruitingPositions: values(formData, "recruitingPositions"),
  });
  if (!parsed.success) goNew("VALIDATION");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema("api").rpc("create_club", createClubRpcArgs(parsed.data));
  if (error) goNew(error.message);
  const result = createClubResultSchema.safeParse(data);
  if (!result.success) goNew("UNKNOWN");
  redirect("/clubs/" + encodeURIComponent(result.data.data.club_id) + "?created=1");
}

/** Édition autorisée seulement pour OWNER/manager du club ciblé ; verrou optimiste en base. */
export async function updateClubAction(formData: FormData): Promise<never> {
  const clubId = text(formData, "clubId");
  await requireOnboardedUser("/clubs/" + encodeURIComponent(clubId) + "/manage/settings");
  const parsed = updateClubInputSchema.safeParse({
    requestId: text(formData, "requestId"),
    clubId,
    expectedUpdatedAt: text(formData, "expectedUpdatedAt"),
    description: text(formData, "description"),
    languages: values(formData, "languages"),
    level: text(formData, "level"),
    recruitingOpen: text(formData, "recruitingOpen") === "true",
    recruitingPositions: values(formData, "recruitingPositions"),
  });
  if (!parsed.success) goSettings(clubId, "VALIDATION");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema("api").rpc("update_club", updateClubRpcArgs(parsed.data));
  if (error) goSettings(clubId, error.message);
  const result = updateClubResultSchema.safeParse(data);
  if (!result.success) goSettings(clubId, "UNKNOWN");
  redirect("/clubs/" + encodeURIComponent(result.data.data.club_id) + "?updated=1");
}
