import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POSITION_GROUPS, type Platform, type Position } from "@/features/onboarding/referentials";
import type { ClubLevel, ClubRole, MembershipSlot } from "./contract";

export type OwnClub = {
  id: string;
  name: string;
  slot: MembershipSlot;
  role: ClubRole;
  recruitingOpen: boolean;
};
export type ClubMember = {
  profileId: string;
  handle: string;
  mainPosition: Position;
  role: ClubRole;
  slot: MembershipSlot;
};
export type ClubDetails = {
  id: string;
  name: string;
  description: string | null;
  platform: Platform;
  languages: string[];
  level: ClubLevel;
  recruitingOpen: boolean;
  recruitingPositions: Position[];
  updatedAt: string;
  members: ClubMember[];
  canManage: boolean;
  viewerIsMember: boolean;
};

const groupOf = (position: string) => POSITION_GROUPS.find((g) =>
  (g.positions as readonly string[]).includes(position))?.key ?? "ATT";

export function sortClubMembers(members: ClubMember[]): ClubMember[] {
  const order = { GK: 0, DEF: 1, MID: 2, ATT: 3 } as const;
  return [...members].sort((a, b) => {
    const diff = order[groupOf(a.mainPosition)] - order[groupOf(b.mainPosition)];
    return diff || a.handle.localeCompare(b.handle, "fr");
  });
}

/** Clubs affiliés réels du profil. Les policies B2 filtrent chaque lecture. */
export async function getOwnClubs(userId: string): Promise<OwnClub[]> {
  const supabase = await createSupabaseServerClient();
  const { data: membership, error } = await supabase
    .from("club_memberships")
    .select("club_id, slot, role")
    .eq("profile_id", userId)
    .eq("is_active", true);
  if (error || !membership?.length) return [];
  const ids = membership.map((x) => x.club_id as string);
  const { data: clubs, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, recruiting_open")
    .in("id", ids)
    .eq("status", "active");
  if (clubError || !clubs) return [];
  const found = new Map(clubs.map((x) => [String(x.id), x]));
  return membership
    .flatMap((x) => {
      const club = found.get(String(x.club_id));
      if (!club) return [];
      return [{
        id: String(x.club_id),
        name: String(club.name),
        slot: x.slot as MembershipSlot,
        role: x.role as ClubRole,
        recruitingOpen: Boolean(club.recruiting_open),
      }];
    })
    .sort((a, b) => a.slot === b.slot ? a.name.localeCompare(b.name, "fr") : a.slot === "primary" ? -1 : 1);
}

/** Fiche et effectif protégés par les RLS B1/B2 (sans service_role). */
export async function getClubForViewer(clubId: string, userId: string): Promise<ClubDetails | null> {
  const supabase = await createSupabaseServerClient();
  const { data: club, error } = await supabase
    .from("clubs")
    .select("id,name,description,platform,languages,level,recruiting_open,recruiting_positions,updated_at")
    .eq("id", clubId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !club) return null;
  const { data: affiliations, error: memberError } = await supabase
    .from("club_memberships")
    .select("profile_id, role, slot")
    .eq("club_id", clubId)
    .eq("is_active", true);
  if (memberError) return null;
  const rows = affiliations ?? [];
  const ids = rows.map((x) => String(x.profile_id));
  const { data: profiles, error: profileError } = ids.length
    ? await supabase.from("profiles").select("id,handle,main_position").in("id", ids)
    : { data: [], error: null };
  if (profileError) return null;
  const visible = new Map((profiles ?? []).map((p) => [String(p.id), p]));
  const members: ClubMember[] = rows.flatMap((x) => {
    const p = visible.get(String(x.profile_id));
    if (!p) return []; // Ne jamais afficher le membre si son profil est masqué par blocage.
    return [{
      profileId: String(x.profile_id),
      handle: String(p.handle),
      mainPosition: p.main_position as Position,
      role: x.role as ClubRole,
      slot: x.slot as MembershipSlot,
    }];
  });
  const viewer = members.find((m) => m.profileId === userId);
  return {
    id: String(club.id),
    name: String(club.name),
    description: (club.description as string | null) ?? null,
    platform: club.platform as Platform,
    languages: club.languages as string[],
    level: club.level as ClubLevel,
    recruitingOpen: Boolean(club.recruiting_open),
    recruitingPositions: club.recruiting_positions as Position[],
    updatedAt: String(club.updated_at),
    members: sortClubMembers(members),
    canManage: viewer?.role === "owner" || viewer?.role === "manager",
    viewerIsMember: Boolean(viewer),
  };
}
