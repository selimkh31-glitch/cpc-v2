-- S-1.9 — Avatars privés (ADR-0015 : S1, S5, S7 côté base ; S2/S3/S6 non exécutables avant blocages/clubs).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'qa_av_a@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b1', 'qa_av_b@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c1', 'qa_av_c@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, handle, platform, main_position, deleted_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'qa_av_a', 'pc', 'ST', null),
  ('00000000-0000-4000-8000-0000000000b1', 'qa_av_b', 'pc', 'CB', null),
  ('00000000-0000-4000-8000-0000000000c1', 'qa_av_c', 'pc', 'GK', now());
-- Objets existants (propriétaire postgres, hors RLS) : avatar de B, avatar de C (profil supprimé).
insert into storage.objects (bucket_id, name, owner) values
  ('avatars', '00000000-0000-4000-8000-0000000000b1/11111111-1111-4111-8111-111111111111.png', '00000000-0000-4000-8000-0000000000b1'),
  ('avatars', '00000000-0000-4000-8000-0000000000c1/22222222-2222-4222-8222-222222222222.png', '00000000-0000-4000-8000-0000000000c1');

-- Bucket (ADR-0015 §1 et §4).
select is((select public from storage.buckets where id = 'avatars'), false, 'Bucket avatars privé');
select is((select file_size_limit from storage.buckets where id = 'avatars'), 2097152::bigint, 'S7 — taille maximale 2 Mo');
select is((select allowed_mime_types from storage.buckets where id = 'avatars'), array['image/png', 'image/jpeg', 'image/webp'],
  'S7 — MIME en liste blanche, SVG exclu');

-- S1 : anonyme.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 0, 'S1 — anonyme : aucun objet visible');
reset role;

-- Persona A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-4000-8000-0000000000a1/33333333-3333-4333-8333-333333333333.webp', '00000000-0000-4000-8000-0000000000a1')$$,
  'A dépose un avatar dans son dossier');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-4000-8000-0000000000b1/44444444-4444-4444-8444-444444444444.png', '00000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'S5 — écriture dans le dossier de B refusée');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-4000-8000-0000000000a1/55555555-5555-4555-8555-555555555555.svg', '00000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'S7 — extension SVG refusée par la policy');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-4000-8000-0000000000a1/mon-avatar.png', '00000000-0000-4000-8000-0000000000a1')$$,
  '42501', null, 'Nom de fichier non UUID refusé');
select is((select count(*)::int from storage.objects where name like '00000000-0000-4000-8000-0000000000b1/%'), 1,
  'A voit l''avatar d''un profil visible (B)');
select is((select count(*)::int from storage.objects where name like '00000000-0000-4000-8000-0000000000c1/%'), 0,
  'A ne voit pas l''avatar d''un profil supprimé (C)');
select lives_ok($$update public.profiles set avatar_path = '00000000-0000-4000-8000-0000000000a1/33333333-3333-4333-8333-333333333333.webp' where id = '00000000-0000-4000-8000-0000000000a1'$$,
  'A référence son propre avatar');
select throws_ok($$update public.profiles set avatar_path = '00000000-0000-4000-8000-0000000000b1/11111111-1111-4111-8111-111111111111.png' where id = '00000000-0000-4000-8000-0000000000a1'$$,
  '23514', null, 'A ne peut pas référencer l''avatar de B');
reset role;

-- Persona B : ne peut ni modifier ni supprimer l'objet de A (aucune ligne visée).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from storage.objects where name like '00000000-0000-4000-8000-0000000000a1/%'), 1, 'B voit l''avatar de A (profil visible)');
reset role;

-- R2 / R3 sur les fonctions de policies.
select ok(not has_function_privilege('anon', 'storage_policies.avatar_readable(text)', 'EXECUTE')
       and not has_function_privilege('anon', 'storage_policies.avatar_writable(text)', 'EXECUTE'),
  'R2 — fonctions de policies non exécutables par anon');
select ok(not has_function_privilege('authenticated', 'private.avatar_is_visible(text)', 'EXECUTE')
       and not has_function_privilege('authenticated', 'private.avatar_path_is_valid(text)', 'EXECUTE'),
  'R2 — fonctions private non exécutables par authenticated');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'storage_policies' and p.prosecdef and not ('search_path=""' = any (coalesce(p.proconfig, '{}')))), 0,
  'R3 — search_path vide sur les fonctions de policies');

select * from finish();
rollback;
