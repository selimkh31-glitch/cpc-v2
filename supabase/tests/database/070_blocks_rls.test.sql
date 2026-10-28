-- P2-B · B1 — Blocages, visibilité bidirectionnelle, commandes block_user / unblock_user
-- (docs/27 §3, contrat docs/26 §3–§4, ADR-0004 R1–R4, ADR-0011 P1/P2).
-- Personas synthétiques : A (neutre), O (cible du blocage), Z (bloqueur), D (profil supprimé),
-- X (authentifié sans profil), anon. Tout est annulé en fin de test (rollback).
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000007a1', 'qa_b1_a@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000007b1', 'qa_b1_o@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000007c1', 'qa_b1_z@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000007d1', 'qa_b1_d@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000007e1', 'qa_b1_x@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, handle, platform, main_position, deleted_at) values
  ('00000000-0000-4000-8000-0000000007a1', 'qa_b1_alpha', 'ps5', 'ST', null),
  ('00000000-0000-4000-8000-0000000007b1', 'qa_b1_oscar', 'pc', 'CB', null),
  ('00000000-0000-4000-8000-0000000007c1', 'qa_b1_zulu', 'ps5', 'GK', null),
  ('00000000-0000-4000-8000-0000000007d1', 'qa_b1_delta', 'pc', 'CM', now());
insert into public.profile_positions (profile_id, position) values ('00000000-0000-4000-8000-0000000007b1', 'LB');
insert into storage.objects (bucket_id, name, owner) values
  ('avatars', '00000000-0000-4000-8000-0000000007b1/11111111-1111-4111-8111-111111111111.png', '00000000-0000-4000-8000-0000000007b1');

-- ── Structure et privilèges ──────────────────────────────────────────────────────────────────
select ok((select relrowsecurity from pg_class where oid = 'public.user_blocks'::regclass), 'P2 — RLS activée sur user_blocks');
select ok(not has_schema_privilege('anon', 'rls_policies', 'USAGE'), 'P4 — anon sans USAGE sur rls_policies');
select ok(has_schema_privilege('authenticated', 'rls_policies', 'USAGE'), 'rls_policies utilisable par authenticated (policies)');
select ok(not has_table_privilege('authenticated', 'public.user_blocks', 'INSERT')
      and not has_table_privilege('authenticated', 'public.user_blocks', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.user_blocks', 'DELETE'), 'P2 — aucune écriture directe accordée sur user_blocks');
select ok(not has_table_privilege('anon', 'public.user_blocks', 'SELECT'), 'P2 — anon sans lecture de user_blocks');
select is(private.has_active_sanction('00000000-0000-4000-8000-0000000007a1'), false, 'Stub documenté : has_active_sanction = false (Phase 5)');

-- ── anon (n° 1) ──────────────────────────────────────────────────────────────────────────────
set local role anon;
select throws_ok($$select count(*) from public.user_blocks$$, '42501', null, 'n° 1 — anon : user_blocks refusé');
select throws_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007b1')$$, '42501', null, 'R2 — anon : block_user refusé');
select throws_ok($$select rls_policies.can_see_profile('00000000-0000-4000-8000-0000000007b1')$$, '42501', null, 'P4 — anon : rls_policies refusé');
reset role;

-- ── Z bloque O (n° 2, 3) ────────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000007c1","role":"authenticated"}';
select is((api.block_user('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000007b1') -> 'data' ->> 'blocked'), 'true',
  'n° 2 — Z bloque O');
select is((api.block_user('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000007b1') -> 'data' ->> 'blocked'), 'true',
  'n° 3 — rejeu du même request_id : même réponse');
select lives_ok($$select api.block_user('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-0000000007b1')$$,
  'Double appel avec un autre request_id : accepté sans doublon');
-- n° 4 : Z voit son blocage.
select is((select count(*)::int from public.user_blocks), 1, 'n° 4 — Z voit sa ligne de blocage (une seule)');
-- n° 6 : invisibilité dans le sens bloqueur → bloqué.
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000007b1'), 0, 'n° 6 — Z ne voit plus le profil de O');
select is((select count(*)::int from public.profile_positions where profile_id = '00000000-0000-4000-8000-0000000007b1'), 0,
  'n° 9 — Z ne voit plus les postes de O');
select is(storage_policies.avatar_readable('00000000-0000-4000-8000-0000000007b1/11111111-1111-4111-8111-111111111111.png'), false,
  'n° 10 — avatar de O illisible pour Z');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars' and owner = '00000000-0000-4000-8000-0000000007b1'), 0,
  'n° 10 — objet Storage de O invisible pour Z (policy avatars_select)');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000007c1'), 1, 'n° 8 — Z voit toujours son propre profil');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000007a1'), 1, 'Z voit toujours les profils non bloqués (A)');
-- n° 12 : écritures directes refusées.
select throws_ok($$insert into public.user_blocks (blocker_id, blocked_id) values ('00000000-0000-4000-8000-0000000007c1', '00000000-0000-4000-8000-0000000007a1')$$,
  '42501', null, 'n° 12 — INSERT direct refusé');
select throws_ok($$update public.user_blocks set created_at = now()$$, '42501', null, 'n° 12 — UPDATE direct refusé');
select throws_ok($$delete from public.user_blocks$$, '42501', null, 'n° 12 — DELETE direct refusé');
select throws_ok($$select private.is_blocked_between('00000000-0000-4000-8000-0000000007c1', '00000000-0000-4000-8000-0000000007b1')$$,
  '42501', null, 'P4 — private inaccessible à authenticated');
-- n° 11 : validations.
select throws_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007c1')$$, 'P0001', 'VALIDATION', 'n° 11 — se bloquer soi-même refusé');
select throws_ok($$select api.block_user(gen_random_uuid(), gen_random_uuid())$$, 'P0001', 'VALIDATION', 'n° 11 — cible inconnue refusée');
select throws_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007d1')$$, 'P0001', 'VALIDATION', 'n° 11 — profil supprimé refusé');
select throws_ok($$select api.block_user(null, '00000000-0000-4000-8000-0000000007a1')$$, 'P0001', 'VALIDATION', 'R4 — request_id obligatoire');
reset role;

-- ── O, le bloqué (n° 5 : non-divulgation ; bidirectionnalité) ───────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000007b1","role":"authenticated"}';
select is((select count(*)::int from public.user_blocks), 0, 'n° 5 — O ne voit aucune ligne : il ne peut pas savoir qui l''a bloqué');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000007c1'), 0, 'n° 6 — bidirectionnel : O ne voit pas le profil de Z');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000007b1'), 1, 'n° 8 — O voit toujours son propre profil');
select is(storage_policies.avatar_readable('00000000-0000-4000-8000-0000000007b1/11111111-1111-4111-8111-111111111111.png'), true,
  'Avatars existants : O lit toujours son propre avatar');
-- O tente de lever le blocage posé par Z : réponse neutre, blocage de Z intact.
select is((api.unblock_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007c1') -> 'data' ->> 'blocked'), 'false',
  'Non-divulgation — unblock par le bloqué : réponse neutre');
reset role;
select is((select count(*)::int from public.user_blocks where blocker_id = '00000000-0000-4000-8000-0000000007c1'), 1,
  'Le bloqué ne peut pas lever le blocage posé par Z');

-- ── A, tiers neutre (n° 7) ──────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000007a1","role":"authenticated"}';
select is((select count(*)::int from public.profiles where id in ('00000000-0000-4000-8000-0000000007b1','00000000-0000-4000-8000-0000000007c1')), 2,
  'n° 7 — A voit O et Z (le blocage ne concerne qu''eux)');
select is(storage_policies.avatar_readable('00000000-0000-4000-8000-0000000007b1/11111111-1111-4111-8111-111111111111.png'), true,
  'n° 10 — A lit l''avatar de O');
select is((select count(*)::int from public.profile_positions where profile_id = '00000000-0000-4000-8000-0000000007b1'), 1, 'A voit les postes de O');
select is((select count(*)::int from public.user_blocks), 0, 'A ne voit aucun blocage d''autrui');
select lives_ok($$select rls_policies.can_see_profile('00000000-0000-4000-8000-0000000007b1')$$, 'Prédicat de policy exécutable par authenticated');
reset role;

-- ── Identité (R1) ───────────────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000007e1","role":"authenticated"}';
select throws_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007a1')$$, 'P0001', 'UNAUTHENTICATED', 'R1 — sans profil (non onboardé) : refusé');
set local request.jwt.claims = '{"role":"authenticated"}';
select throws_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007a1')$$, 'P0001', 'UNAUTHENTICATED', 'R1 — JWT sans sujet : refusé');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000007d1","role":"authenticated"}';
select throws_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007a1')$$, 'P0001', 'UNAUTHENTICATED', 'R1 — profil supprimé : refusé');
reset role;

-- ── Levée du blocage par Z (n° 13) ──────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000007c1","role":"authenticated"}';
select is((api.unblock_user('00000000-0000-4000-8000-00000000f003', '00000000-0000-4000-8000-0000000007b1') -> 'data' ->> 'blocked'), 'false',
  'n° 13 — Z lève son blocage');
select is((select count(*)::int from public.user_blocks), 0, 'n° 13 — plus aucune ligne');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000007b1'), 1, 'n° 13 — Z voit de nouveau O');
select is(storage_policies.avatar_readable('00000000-0000-4000-8000-0000000007b1/11111111-1111-4111-8111-111111111111.png'), true,
  'n° 13 — avatar de O de nouveau lisible');
select lives_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007b1')$$, 'Rétablissement du blocage');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000007b1'), 0, 'Blocage rétabli : O de nouveau invisible pour Z');
reset role;

-- ── Rate limit (n° 14) : 30 appels par heure, rejeux exclus ─────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000007a1","role":"authenticated"}';
do $$
begin
  for i in 1..30 loop
    perform api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007b1');
  end loop;
end $$;
select throws_ok($$select api.block_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007b1')$$, 'P0001', 'RATE_LIMITED', 'n° 14 — 31ᵉ appel de l''heure refusé');
select throws_ok($$select api.unblock_user(gen_random_uuid(), '00000000-0000-4000-8000-0000000007b1')$$, 'P0001', 'RATE_LIMITED', 'n° 14 — bucket partagé avec unblock_user');
reset role;
select is((select count(*)::int from public.user_blocks where blocker_id = '00000000-0000-4000-8000-0000000007a1'), 1,
  'n° 14 — appels multiples : une seule ligne de blocage');

-- ── n° 15 et non-régression ─────────────────────────────────────────────────────────────────
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'rls_policies'), 0,
  'rls_policies ne contient aucune relation');

select * from finish();
rollback;
