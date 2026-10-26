import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLATFORMS, POSITIONS, type Platform, type Position as PositionCode } from "@/features/onboarding/referentials";

export type OwnProfile = {
  id: string;
  handle: string;
  platform: Platform;
  mainPosition: PositionCode;
  secondaryPositions: PositionCode[];
  bio: string | null;
  eaGamertag: string | null;
  avatarPath: string | null;
};

const isPlatform = (v: unknown): v is Platform => typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
const isPosition = (v: unknown): v is PositionCode => typeof v === "string" && (POSITIONS as readonly string[]).includes(v);

/** Lecture RLS de son propre profil (JWT de l'utilisateur, jamais de clé secrète). */
export async function getOwnProfile(userId: string): Promise<OwnProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, platform, main_position, bio, ea_gamertag, avatar_path, profile_positions(position)")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || !isPlatform(data.platform) || !isPosition(data.main_position)) return null;
  const positions = Array.isArray(data.profile_positions) ? data.profile_positions : [];
  return {
    id: data.id as string,
    handle: data.handle as string,
    platform: data.platform,
    mainPosition: data.main_position,
    secondaryPositions: positions.map((p: { position: unknown }) => p.position).filter(isPosition),
    bio: (data.bio as string | null) ?? null,
    eaGamertag: (data.ea_gamertag as string | null) ?? null,
    avatarPath: (data.avatar_path as string | null) ?? null,
  };
}
