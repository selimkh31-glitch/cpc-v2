import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applicationSummarySchema } from "@/features/recruitment/contract";

export type ClubApplication = {
  id: string;
  clubId: string;
  profileId: string;
  message: string | null;
  status: "pending" | "awaiting_player_confirmation" | "accepted" | "rejected" | "withdrawn" | "expired";
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  clubName?: string | null;
  applicantHandle?: string | null;
};

function parseRow(row: unknown): ClubApplication | null {
  const r = applicationSummarySchema.safeParse(row);
  if (!r.success) return null;
  return {
    id: r.data.id, clubId: r.data.club_id, profileId: r.data.profile_id,
    message: r.data.message, status: r.data.status, createdAt: r.data.created_at,
    expiresAt: r.data.expires_at,
    isExpired: new Date(r.data.expires_at).getTime() <= Date.now(),
  };
}
const COLUMNS = "id,club_id,profile_id,message,status,created_at,expires_at";

/** Lectures RLS : le candidat voit ses propres demandes, le manager les demandes de son club. */
export async function getOwnClubApplication(clubId: string, userId: string): Promise<ClubApplication | null> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("club_applications").select(COLUMNS)
    .eq("club_id", clubId).eq("profile_id", userId)
    .in("status", ["pending", "awaiting_player_confirmation"])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return error || !data ? null : parseRow(data);
}

export async function getPendingClubApplications(clubId: string): Promise<ClubApplication[] | null> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("club_applications").select(COLUMNS)
    .eq("club_id", clubId).eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true }).limit(100);
  if (error || !data) return null;
  const items = data.map(parseRow).filter((a): a is ClubApplication => a !== null);
  if (!items.length) return items;
  const { data: profiles } = await db.from("profiles").select("id,handle")
    .in("id", items.map(a => a.profileId));
  if (profiles) {
    const handles = new Map(profiles.map(p => [p.id, p.handle]));
    for (const item of items) item.applicantHandle = handles.get(item.profileId) ?? null;
  }
  return items;
}

export async function getOwnClubApplications(userId: string): Promise<ClubApplication[] | null> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("club_applications").select(COLUMNS)
    .eq("profile_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error || !data) return null;
  const items = data.map(parseRow).filter((a): a is ClubApplication => a !== null);
  if (!items.length) return items;
  const ids = [...new Set(items.map(a => a.clubId))];
  const { data: clubs } = await db.from("clubs").select("id,name").in("id", ids);
  if (clubs) {
    const names = new Map(clubs.map(c => [c.id, c.name]));
    for (const item of items) item.clubName = names.get(item.clubId) ?? null;
  }
  return items;
}

export async function getActiveSecondaryMembership(userId: string): Promise<{
  id: string; role: "owner" | "manager" | "member"; clubName: string | null;
} | null> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("club_memberships")
    .select("id,role,clubs(name)").eq("profile_id", userId)
    .eq("slot", "secondary").eq("is_active", true).maybeSingle();
  if (error || !data || data.role !== "owner" && data.role !== "manager" && data.role !== "member") return null;
  const joined: unknown = data.clubs;
  const club = (Array.isArray(joined) ? joined[0] : joined) as Record<string, unknown> | null;
  return {
    id: data.id, role: data.role,
    clubName: typeof club?.name === "string" ? club.name : null,
  };
}
