import "server-only";
import { signedUrlTtl } from "@/lib/media/ttl";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** URL signée courte (ADR-0015), générée avec le JWT de l'utilisateur : jamais persistée. */
export async function signedAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, signedUrlTtl());
  return error ? null : data.signedUrl;
}
