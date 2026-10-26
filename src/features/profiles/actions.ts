"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { AVATAR_MAX_BYTES, avatarExtension, sniffImageMime } from "@/lib/media/ttl";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gamertagSchema, presentationSchema } from "./schemas";

const back = (query: string): never => redirect(`/profile?${query}`);

/** Champs personnels : UPDATE direct autorisé par colonne et RLS (propriétaire uniquement). */
export async function updatePresentationAction(formData: FormData) {
  const user = await requireOnboardedUser("/profile");
  const parsed = presentationSchema.safeParse({ bio: formData.get("bio") ?? "" });
  if (!parsed.success) back("error=presentation");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ bio: parsed.data!.bio }).eq("id", user.userId);
  back(error ? "error=presentation" : "saved=presentation");
}

export async function updateGamertagAction(formData: FormData) {
  const user = await requireOnboardedUser("/profile");
  const parsed = gamertagSchema.safeParse({ eaGamertag: formData.get("eaGamertag") ?? "" });
  if (!parsed.success) back("error=gamertag");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ ea_gamertag: parsed.data!.eaGamertag }).eq("id", user.userId);
  back(error ? "error=gamertag" : "saved=gamertag");
}

/**
 * Avatar privé (ADR-0015) : contrôle taille + signature réelle côté serveur, nom UUID généré ici,
 * dépôt avec le JWT de l'utilisateur (policies storage), puis suppression de l'ancien objet.
 */
export async function uploadAvatarAction(formData: FormData) {
  const user = await requireOnboardedUser("/profile");
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) back("error=avatar_missing");
  const upload = file as File;
  if (upload.size > AVATAR_MAX_BYTES) back("error=avatar_size");
  const bytes = new Uint8Array(await upload.arrayBuffer());
  const mime = sniffImageMime(bytes);
  const ext = mime ? avatarExtension(mime) : null;
  if (!mime || !ext) back("error=avatar_type");

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", user.userId).maybeSingle();
  const path = `${user.userId}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, bytes, { contentType: mime!, upsert: false });
  if (uploadError) back("error=avatar_upload");
  const { error: updateError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.userId);
  if (updateError) {
    await supabase.storage.from("avatars").remove([path]);
    back("error=avatar_upload");
  }
  const previous = current?.avatar_path as string | null | undefined;
  if (previous && previous !== path) await supabase.storage.from("avatars").remove([previous]);
  back("saved=avatar");
}

export async function removeAvatarAction() {
  const user = await requireOnboardedUser("/profile");
  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", user.userId).maybeSingle();
  const previous = current?.avatar_path as string | null | undefined;
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.userId);
  if (error) back("error=avatar_remove");
  if (previous) await supabase.storage.from("avatars").remove([previous]);
  back("saved=avatar_removed");
}
