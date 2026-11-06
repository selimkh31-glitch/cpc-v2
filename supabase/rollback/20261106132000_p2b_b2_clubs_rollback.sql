-- Rollback contrôlé B2. À EXÉCUTER UNIQUEMENT SUR AUTORISATION EXPLICITE.
-- Aucune donnée de club, d'adhésion ou d'audit ne peut être supprimée silencieusement.
-- btree_gist n'est pas supprimée : l'extension peut servir à d'autres contraintes.

begin;

do $$
begin
  if exists(select 1 from public.clubs) or
     exists(select 1 from public.club_memberships) or
     exists(select 1 from private.membership_events) then
    raise exception 'Rollback B2 REFUSÉ : données de clubs/affiliations/audit présentes. Sauvegarde et décision explicite requises.';
  end if;
end
$$;

drop function if exists api.update_club(uuid,uuid,timestamptz,text,text[],public.club_level,boolean,public.position_code[]);
drop function if exists api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[]);
drop policy if exists memberships_read_visible on public.club_memberships;
drop policy if exists clubs_read_for_onboarded on public.clubs;
drop function if exists rls_policies.can_see_membership(uuid);
drop function if exists rls_policies.can_see_club(uuid);
drop function if exists private.is_club_manager(uuid,uuid);
drop function if exists private.is_club_member(uuid,uuid);
drop function if exists private.active_membership_count(uuid);
drop table if exists private.membership_events;
drop table if exists public.club_memberships;
drop table if exists public.clubs;
drop function if exists private.valid_recruiting_positions(public.position_code[]);
drop function if exists private.valid_club_languages(text[]);
drop function if exists private.club_slug(text);
drop function if exists private.normalize_search(text);
drop type if exists public.membership_end_reason;
drop type if exists public.membership_slot;
drop type if exists public.club_role;
drop type if exists public.club_level;

commit;

-- La table supabase_migrations.schema_migrations n'est jamais modifiée automatiquement :
-- si un rollback a été autorisé et réussi, aligner l'historique séparément après audit.
