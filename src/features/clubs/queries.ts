import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClubMembership = {
  profileId: string;
  handle: string | null;
  position: string | null;
  role: "owner" | "manager" | "member";
  slot: "primary" | "secondary";
};

export type ClubDetail = {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  level: string;
  languages: string[];
  recruitingOpen: boolean;
  recruitingPositions: string[];
  updatedAt: string;
  members: ClubMembership[];
  canManage: boolean;
};

export type MyClub = {
  clubId: string;
  name: string;
  slot: "primary" | "secondary";
  role: "owner" | "manager" | "member";
  recruitingOpen: boolean;
};

/** Les lectures utilisent uniquement le JWT de l'appelant et la RLS, jamais service_role. */
export async function getMyClubs(userId: string): Promise<MyClub[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("club_memberships")
    .select("club_id, slot, role, clubs(id,name,recruiting_open,status)")
    .eq("profile_id", userId).eq("is_active", true);
  if (error || !data) return [];
  const list: MyClub[] = [];
  for (const row of data) {
    const entity: unknown = row.clubs;
    const raw = Array.isArray(entity) ? entity[0] : entity;
    if (!raw || typeof raw !== "object") continue;
    const club = raw as Record<string, unknown>;
    if (club.status !== "active" || typeof club.id !== "string" || typeof club.name !== "string") continue;
    if (row.role !== "owner" && row.role !== "manager" && row.role !== "member") continue;
    if (row.slot !== "primary" && row.slot !== "secondary") continue;
    list.push({ clubId: club.id, name: club.name, slot: row.slot, role: row.role, recruitingOpen: club.recruiting_open === true });
  }
  return list.sort((a, b) => a.slot.localeCompare(b.slot));
}

/** Fiche club : données publiques pour les utilisateurs autorisés, effectif filtré par la RLS B2. */
export async function getClubDetail(clubId: string, userId: string): Promise<ClubDetail | null> {
  const db = await createSupabaseServerClient();
  const { data: club, error } = await db.from("clubs")
    .select("id,name,description,platform,level,languages,recruiting_open,recruiting_positions,updated_at")
    .eq("id", clubId).eq("status", "active").maybeSingle();
  if (error || !club) return null;
  const { data: members, error: membershipError } = await db.from("club_memberships")
    .select("profile_id,role,slot,profiles(handle,main_position)")
    .eq("club_id", clubId).eq("is_active", true);
  if (membershipError) return null;
  const items: ClubMembership[] = [];
  for (const m of members ?? []) {
    if (m.role !== "owner" && m.role !== "manager" && m.role !== "member") continue;
    if (m.slot !== "primary" && m.slot !== "secondary") continue;
    const entity: unknown = m.profiles;
    const p = (Array.isArray(entity) ? entity[0] : entity) as Record<string, unknown> | null;
    items.push({
      profileId: m.profile_id,
      handle: typeof p?.handle === "string" ? p.handle : null,
      position: typeof p?.main_position === "string" ? p.main_position : null,
      role: m.role,
      slot: m.slot,
    });
  }
  return {
    id: club.id,
    name: club.name,
    description: club.description,
    platform: club.platform,
    level: club.level,
    languages: club.languages,
    recruitingOpen: club.recruiting_open,
    recruitingPositions: club.recruiting_positions,
    updatedAt: club.updated_at,
    members: items,
    canManage: items.some((m) => m.profileId === userId && (m.role === "owner" || m.role === "manager")),
  };
}
