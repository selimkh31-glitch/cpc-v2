-- S-1.3 — Accès inter-utilisateurs sur les tables d'identité (ADR-0011 P1/P2, ADR-0004 R4 partiel).
-- Personas synthétiques : A, B, C (C = profil supprimé), anon.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Données de test (postgres, propriétaire des tables : hors RLS).
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-00000000000a', 'qa_a@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000b', 'qa_b@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000c', 'qa_c@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, handle, platform, main_position, deleted_at) values
  ('00000000-0000-4000-8000-00000000000a', 'qa_alpha', 'ps5', 'ST', null),
  ('00000000-0000-4000-8000-00000000000b', 'qa_bravo', 'pc', 'CB', null),
  ('00000000-0000-4000-8000-00000000000c', 'qa_charlie', 'xbox_series', 'GK', now());
insert into public.profile_positions (profile_id, position) values
  ('00000000-0000-4000-8000-00000000000b', 'LB'),
  ('00000000-0000-4000-8000-00000000000c', 'CB');
insert into public.account_settings (profile_id, age_confirmed_at, age_threshold) values
  ('00000000-0000-4000-8000-00000000000a', now(), 18),
  ('00000000-0000-4000-8000-00000000000b', now(), 18);

-- Contraintes (postgres).
select throws_ok($$insert into public.profiles (id, handle, platform, main_position) values ('00000000-0000-4000-8000-00000000000c', 'Bad Handle!', 'pc', 'ST')$$,
  '23514', null, 'Contrainte — format du pseudo');
select throws_ok($$update public.profiles set handle = 'qa_alpha' where id = '00000000-0000-4000-8000-00000000000b'$$,
  '23505', null, 'Contrainte — pseudo unique');
select throws_ok($$update public.profiles set languages = '{fr,en,es,de}' where id = '00000000-0000-4000-8000-00000000000a'$$,
  '23514', null, 'Contrainte — 3 langues maximum');
select throws_ok($$insert into public.account_settings (profile_id, age_confirmed_at, age_threshold) values ('00000000-0000-4000-8000-00000000000c', now(), 16)$$,
  '23514', null, 'Contrainte — seuil d''âge ≥ 18 (D-12)');
select is((select count(*)::int from unnest(enum_range(null::public.position_code))), 15, 'D-14 — 15 codes de poste');
select is(
  array[public.position_group_of('GK'), public.position_group_of('CB'), public.position_group_of('CAM'), public.position_group_of('ST')]::text[],
  array['GK', 'DEF', 'MID', 'ATT'],
  'D-14 — groupes GK / DEF / MID / ATT'
);

-- Persona A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select is((select count(*)::int from public.profiles where id in ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-00000000000b')), 2,
  'P2 — A lit son profil et celui de B');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-00000000000c'), 0,
  'P2 — A ne voit pas un profil supprimé');
select is((select count(*)::int from public.profile_positions where profile_id = '00000000-0000-4000-8000-00000000000b'), 1,
  'P2 — A voit les postes d''un profil visible');
select is((select count(*)::int from public.profile_positions where profile_id = '00000000-0000-4000-8000-00000000000c'), 0,
  'P2 — A ne voit pas les postes d''un profil supprimé');
select lives_ok($$update public.profiles set bio = 'Bio QA' where id = '00000000-0000-4000-8000-00000000000a'$$,
  'P2 — A modifie sa présentation');
select is((select bio from public.profiles where id = '00000000-0000-4000-8000-00000000000a'), 'Bio QA', 'P2 — modification effective');
select is((with u as (update public.profiles set bio = 'pirate' where id = '00000000-0000-4000-8000-00000000000b' returning 1) select count(*)::int from u), 0,
  'R4 — A ne peut pas modifier le profil de B (IDOR)');
select throws_ok($$update public.profiles set handle = 'qa_newname' where id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null, 'P2 — pseudo non modifiable directement (commande dédiée)');
select throws_ok($$update public.profiles set main_position = 'GK' where id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null, 'P2 — poste principal non modifiable directement');
select throws_ok($$insert into public.profiles (id, handle, platform, main_position) values ('00000000-0000-4000-8000-00000000000a', 'qa_dup', 'pc', 'ST')$$,
  '42501', null, 'P2 — aucune création directe de profil');
select throws_ok($$delete from public.profiles where id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null, 'P2 — aucune suppression directe de profil');
select throws_ok($$insert into public.profile_positions (profile_id, position) values ('00000000-0000-4000-8000-00000000000a', 'CM')$$,
  '42501', null, 'P2 — aucune écriture directe des postes');
select is((select count(*)::int from public.account_settings), 1, 'P2 — A ne lit que ses propres paramètres');
select is((with u as (update public.account_settings set marketing_opt_in = true where profile_id = '00000000-0000-4000-8000-00000000000b' returning 1) select count(*)::int from u), 0,
  'R4 — A ne peut pas modifier les paramètres de B');
select throws_ok($$update public.account_settings set age_threshold = 18 where profile_id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null, 'P2 — le seuil d''âge n''est pas modifiable par le client');
select throws_ok($$select count(*) from private.staff_members$$,
  '42501', null, 'P2 — schéma private inaccessible à authenticated');
reset role;

-- Persona anon.
set local role anon;
select throws_ok($$select count(*) from public.profiles$$, '42501', null, 'P1 — anon ne lit aucun profil');
select throws_ok($$select count(*) from public.account_settings$$, '42501', null, 'P1 — anon ne lit aucun paramètre');
reset role;

select * from finish();
rollback;
