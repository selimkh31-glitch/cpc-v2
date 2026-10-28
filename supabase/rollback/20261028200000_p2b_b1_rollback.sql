-- ROLLBACK P2-B · B1 (migration 20261028200000_p2b_b1_security_blocks.sql).
-- N'est JAMAIS appliqué automatiquement : exécution manuelle, sur GO explicite de Selim uniquement.
--
-- Garantie : aucune donnée de blocage n'est supprimée silencieusement.
--   - user_blocks vide            → table supprimée ;
--   - user_blocks non vide        → table ARCHIVÉE dans private (non exposé, aucun privilège client),
--                                   sous private.user_blocks_rollback_b1, avec un NOTICE indiquant le
--                                   nombre de lignes conservées. Une suppression éventuelle sera une
--                                   décision distincte et explicite.
-- Effet : retour exact au comportement de la Phase 1 (policy profiles et avatars d'origine).
--
-- Après exécution sur le staging, l'entrée correspondante de supabase_migrations.schema_migrations
-- (version enregistrée lors de l'application, relevée par list_migrations) doit être retirée par une
-- opération distincte, documentée dans le rapport ; ce script ne la touche pas.

begin;

-- 1. Policy profiles d'origine (S-1.3).
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (deleted_at is null or id = (select auth.uid()));

-- 2. Visibilité des avatars d'origine (S-1.9).
create or replace function private.avatar_is_visible(p_name text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.profiles p
       where p.id::text = split_part(p_name, '/', 1)
         and p.deleted_at is null
    )
  )
$$;
revoke execute on function private.avatar_is_visible(text) from public, anon, authenticated, service_role;

-- 3. Commandes et prédicats.
drop function if exists api.block_user(uuid, uuid);
drop function if exists api.unblock_user(uuid, uuid);
drop function if exists rls_policies.can_see_profile(uuid);
drop schema if exists rls_policies;  -- échoue (sans CASCADE) si un objet inattendu s'y trouve : arrêt volontaire.

-- 4. Données de blocage : conservées si présentes.
do $$
declare
  v_count bigint;
begin
  if to_regclass('public.user_blocks') is null then
    return;
  end if;
  select count(*) into v_count from public.user_blocks;
  if v_count = 0 then
    drop table public.user_blocks;
    raise notice 'Rollback B1 : user_blocks vide, table supprimée.';
  else
    if to_regclass('private.user_blocks_rollback_b1') is not null then
      raise exception 'Rollback B1 : private.user_blocks_rollback_b1 existe déjà ; arrêt sans modification.';
    end if;
    drop policy if exists user_blocks_select_own on public.user_blocks;
    revoke all on public.user_blocks from public, anon, authenticated;
    alter table public.user_blocks rename to user_blocks_rollback_b1;
    alter table public.user_blocks_rollback_b1 set schema private;
    raise notice 'Rollback B1 : % blocage(s) CONSERVÉ(S) dans private.user_blocks_rollback_b1 (aucune suppression).', v_count;
  end if;
end
$$;

-- 5. Helpers B1 (après la table : is_blocked_between la lit).
drop function if exists private.is_blocked_between(uuid, uuid);
drop function if exists private.has_active_sanction(uuid);
drop function if exists private.is_onboarded(uuid);
drop function if exists private.uid();
drop function if exists private.consume_rate_limit(uuid, text, interval, integer);
delete from private.rate_limits where bucket = 'block_user';

commit;
