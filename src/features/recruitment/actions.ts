"use server";

import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rpcErrorCode } from "@/lib/errors/rpc";
import {
  applyToClubSchema, applyToClubArgs, withdrawApplicationSchema, withdrawApplicationArgs,
  decideApplicationSchema, decideApplicationArgs, confirmMembershipReplacementSchema,
  confirmMembershipReplacementArgs, applicationCommandResultSchema,
} from "@/features/recruitment/contract";

function value(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
function safeClubPath(clubId: string): string {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(clubId)
    ? "/clubs/" + clubId : "/applications";
}
function resultOk(data: unknown): boolean {
  return applicationCommandResultSchema.safeParse(data).success;
}

/** Le client n'a jamais de service_role : toutes les mutations passent par la RPC sécurisée. */
export async function applyToClubAction(form: FormData): Promise<never> {
  await requireOnboardedUser("/explore/clubs");
  const back = safeClubPath(value(form, "clubId"));
  const parsed = applyToClubSchema.safeParse({
    requestId: value(form, "requestId"), clubId: value(form, "clubId"),
    message: value(form, "message"),
  });
  if (!parsed.success) redirect(back + "?error=VALIDATION");
  const db = await createSupabaseServerClient();
  const { data, error } = await db.schema("api").rpc("apply_to_club", applyToClubArgs(parsed.data));
  if (error) redirect(back + "?error=" + rpcErrorCode(error));
  if (!resultOk(data)) redirect(back + "?error=UNKNOWN");
  redirect(back + "?application=sent");
}

export async function withdrawApplicationAction(form: FormData): Promise<never> {
  await requireOnboardedUser("/applications");
  const back = safeClubPath(value(form, "clubId"));
  const parsed = withdrawApplicationSchema.safeParse({
    requestId: value(form, "requestId"), applicationId: value(form, "applicationId"),
  });
  if (!parsed.success) redirect(back + "?error=VALIDATION");
  const db = await createSupabaseServerClient();
  const { data, error } = await db.schema("api").rpc("withdraw_application", withdrawApplicationArgs(parsed.data));
  if (error) redirect(back + "?error=" + rpcErrorCode(error));
  if (!resultOk(data)) redirect(back + "?error=UNKNOWN");
  redirect(back + "?application=withdrawn");
}

export async function decideApplicationAction(form: FormData): Promise<never> {
  await requireOnboardedUser("/profile");
  const back = safeClubPath(value(form, "clubId")) + "/manage/applications";
  const parsed = decideApplicationSchema.safeParse({
    requestId: value(form, "requestId"), applicationId: value(form, "applicationId"),
    decision: value(form, "decision"),
  });
  if (!parsed.success) redirect(back + "?error=VALIDATION");
  const db = await createSupabaseServerClient();
  const { data, error } = await db.schema("api").rpc("decide_application", decideApplicationArgs(parsed.data));
  if (error) redirect(back + "?error=" + rpcErrorCode(error));
  const result = applicationCommandResultSchema.safeParse(data);
  if (!result.success) redirect(back + "?error=UNKNOWN");
  redirect(back + "?saved=" + result.data.data.status);
}

export async function confirmMembershipReplacementAction(form: FormData): Promise<never> {
  await requireOnboardedUser("/applications");
  const parsed = confirmMembershipReplacementSchema.safeParse({
    requestId: value(form, "requestId"),
    applicationId: value(form, "applicationId"),
    replaceMembershipId: value(form, "replaceMembershipId"),
    acknowledgeManagerRoleLoss: value(form, "acknowledgeManagerRoleLoss") === "true",
  });
  if (!parsed.success) redirect("/applications?error=VALIDATION");
  const db = await createSupabaseServerClient();
  const { data, error } = await db.schema("api").rpc(
    "confirm_membership_replacement", confirmMembershipReplacementArgs(parsed.data),
  );
  if (error) redirect("/applications?error=" + rpcErrorCode(error));
  if (!resultOk(data)) redirect("/applications?error=UNKNOWN");
  redirect("/applications?saved=accepted");
}
