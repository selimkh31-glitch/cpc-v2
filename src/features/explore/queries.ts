import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchClubsResultSchema, type ClubSummary } from "@/features/clubs/contract";
import { searchClubsRpcArgs, type ClubFilters } from "@/features/explore/contract";

/** Recherche côté serveur, sous JWT utilisateur et RLS, sans service_role. */
export async function findRealClubs(filters: ClubFilters): Promise<{
  clubs: ClubSummary[];
  nextCursor: string | null;
  error: boolean;
}> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.schema("api").rpc("search_clubs", searchClubsRpcArgs(filters));
  if (error) return { clubs: [], nextCursor: null, error: true };
  const parsed = searchClubsResultSchema.safeParse(data);
  if (!parsed.success) return { clubs: [], nextCursor: null, error: true };
  return {
    clubs: parsed.data.data.items,
    nextCursor: parsed.data.data.next_cursor,
    error: false,
  };
}
