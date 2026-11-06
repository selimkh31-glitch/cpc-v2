-- B2 : contrats RLS Clubs / affiliations, D-21/D-23/B.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id,email,aud,role) values
 ('00000000-0000-4000-8000-000000000b21','qa_b2_owner@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000b22','qa_b2_reader@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000b23','qa_b2_block@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000b24','qa_b2_noonboard@example.test','authenticated','authenticated');

insert into public.profiles (id,handle,platform,main_position,languages) values
 ('00000000-0000-4000-8000-000000000b21','qa_b2_owner','ps5','ST','{fr}'),
 ('00000000-0000-4000-8000-000000000b22','qa_b2_reader','ps5','GK','{fr}'),
 ('00000000-0000-4000-8000-000000000b23','qa_b2_block','pc','CB','{en}');

insert into public.clubs(id,name,slug,search_name,platform,languages,level,recruiting_open,recruiting_positions,created_by)
values('10000000-0000-4000-8000-000000000b21','Club QA B2','club-qa-b2','club qa b2','ps5','{fr}','competitive',true,'{GK,CB}', '00000000-0000-4000-8000-000000000b21');
insert into public.club_memberships(id,club_id,profile_id,slot,role)
values('20000000-0000-4000-8000-000000000b21','10000000-0000-4000-8000-000000000b21',
       '00000000-0000-4000-8000-000000000b21','primary','owner');

-- Structure et contraintes.
select ok((select relrowsecurity from pg_class where oid = 'public.clubs'::regclass),'clubs : RLS active');
select ok((select relrowsecurity from pg_class where oid = 'public.club_memberships'::regclass),'club_memberships : RLS active');
select ok((select relrowsecurity from pg_class where oid = 'private.membership_events'::regclass),'events privés : RLS active');
select is((select count(*)::int from pg_constraint
  where conrelid='public.club_memberships'::regclass and contype='x' and condeferrable),2,
  'PRIMARY / SECONDARY et OWNER : exclusions différables');
select ok(not has_table_privilege('anon','public.clubs','SELECT'),'anon : aucun privilège club');
select ok(not has_table_privilege('authenticated','public.clubs','INSERT') and
  not has_table_privilege('authenticated','public.club_memberships','DELETE'),
  'authenticated : aucune écriture directe');
select ok(not has_schema_privilege('authenticated','private','USAGE'),
  'events privés hors portée des clients');
select ok(not has_function_privilege('anon','rls_policies.can_see_club(uuid)','EXECUTE'),
  'anon : prédicat du club fermé');
select ok(not has_function_privilege('anon','api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[])','EXECUTE'),
  'anon : création interdite');

-- Utilisateur non onboardé : aucune visibilité.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b24","role":"authenticated"}';
select is((select count(*)::int from public.clubs),0,'non onboardé : aucun club');
select is((select count(*)::int from public.club_memberships),0,'non onboardé : aucun effectif');
reset role;

-- Lecteur neutre : club actif et effectif, mais pas d'inactifs.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b22","role":"authenticated"}';
select is((select count(*)::int from public.clubs),1,'lecteur : un club actif');
select is((select count(*)::int from public.club_memberships),1,'lecteur : effectif actif visible');
select throws_ok($$insert into public.clubs(name,slug,search_name,platform,languages,level,created_by)
values('Triche','triche','triche','ps5','{fr}','casual','00000000-0000-4000-8000-000000000b22')$$,
  '42501',null,'lecteur : création directe interdite');
reset role;

-- Blocage dans les deux sens : pas de club ni d'effectif visible.
insert into public.user_blocks(blocker_id,blocked_id)
values('00000000-0000-4000-8000-000000000b23','00000000-0000-4000-8000-000000000b21');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b23","role":"authenticated"}';
select is((select count(*)::int from public.clubs),0,'bloqueur : club du propriétaire invisible');
select is((select count(*)::int from public.club_memberships),0,'bloqueur : effectif invisible');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b21","role":"authenticated"}';
select is((select count(*)::int from public.clubs),1,'propriétaire : son club reste visible');
select is((select count(*)::int from public.club_memberships),1,'propriétaire : son affiliation visible');
reset role;

-- Club dissous : les étrangers ne le voient plus, mais son créateur garde son historique.
update public.clubs set status='dissolved',dissolved_at=now()
where id='10000000-0000-4000-8000-000000000b21';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b22","role":"authenticated"}';
select is((select count(*)::int from public.clubs),0,'club dissous invisible pour les étrangers');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b21","role":"authenticated"}';
select is((select count(*)::int from public.clubs),1,'créateur : historique du club dissous visible');
select is((select count(*)::int from public.club_memberships),1,'créateur : historique affiliation conservé');
reset role;

select ok((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='rls_policies')=0,'rls_policies sans tables');
select is((select count(*)::int from private.membership_events),0,'aucun événement inventé par les fixtures');

select * from finish();
rollback;
