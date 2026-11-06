-- CPC V2 / P2-D2 — parcours candidature, rôles, consentement, journaux.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users(id,email,aud,role) values
('00000000-0000-4000-8000-000000000f11','qa_d2_owner@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000f12','qa_d2_candidate@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000f13','qa_d2_old_owner@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000f14','qa_d2_other_owner@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000f15','qa_d2_other@example.test','authenticated','authenticated');
insert into public.profiles(id,handle,platform,main_position,languages) values
('00000000-0000-4000-8000-000000000f11','qa_d2_owner','ps5','GK','{fr}'),
('00000000-0000-4000-8000-000000000f12','qa_d2_candidate','ps5','ST','{fr}'),
('00000000-0000-4000-8000-000000000f13','qa_d2_old_owner','ps5','CM','{fr}'),
('00000000-0000-4000-8000-000000000f14','qa_d2_new_owner','ps5','CB','{fr}'),
('00000000-0000-4000-8000-000000000f15','qa_d2_other','pc','RW','{en}');
insert into public.clubs(id,name,slug,search_name,platform,languages,level,recruiting_open,created_by) values
('10000000-0000-4000-8000-000000000f11','QA D2 Target','qa-d2-target','qa d2 target','ps5','{fr}','casual',true,'00000000-0000-4000-8000-000000000f11'),
('10000000-0000-4000-8000-000000000f13','QA D2 Secondary','qa-d2-secondary','qa d2 secondary','ps5','{fr}','casual',false,'00000000-0000-4000-8000-000000000f13'),
('10000000-0000-4000-8000-000000000f14','QA D2 Primary','qa-d2-primary','qa d2 primary','ps5','{fr}','casual',false,'00000000-0000-4000-8000-000000000f14');
insert into public.club_memberships(club_id,profile_id,slot,role) values
('10000000-0000-4000-8000-000000000f11','00000000-0000-4000-8000-000000000f11','primary','owner'),
('10000000-0000-4000-8000-000000000f13','00000000-0000-4000-8000-000000000f13','primary','owner'),
('10000000-0000-4000-8000-000000000f14','00000000-0000-4000-8000-000000000f14','primary','owner'),
('10000000-0000-4000-8000-000000000f14','00000000-0000-4000-8000-000000000f12','primary','member'),
('10000000-0000-4000-8000-000000000f13','00000000-0000-4000-8000-000000000f12','secondary','manager');

select ok((select relrowsecurity from pg_class where oid='private.application_events'::regclass),'audit privé RLS');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='api' and p.proname in ('apply_to_club','withdraw_application','decide_application','confirm_membership_replacement')
 and p.prosecdef and 'search_path=""'=any(p.proconfig)),4,'4 RPC à search_path vide');
select ok(not has_function_privilege('anon','api.apply_to_club(uuid,uuid,text)','EXECUTE'),'anon apply interdit');
select ok(not has_function_privilege('anon','api.withdraw_application(uuid,uuid)','EXECUTE'),'anon retrait interdit');
select ok(not has_function_privilege('anon','api.decide_application(uuid,uuid,text)','EXECUTE'),'anon decision interdite');
select ok(not has_function_privilege('anon','api.confirm_membership_replacement(uuid,uuid,uuid,boolean)','EXECUTE'),'anon remplacement interdit');

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f12","role":"authenticated"}';
select is((api.apply_to_club('11111111-1111-4111-8111-11111111f012','10000000-0000-4000-8000-000000000f11','Je veux rejoindre')->'data'->>'status'),'pending','candidature créée par candidat');
select is((api.apply_to_club('11111111-1111-4111-8111-11111111f012','10000000-0000-4000-8000-000000000f11','Je veux rejoindre')->'data'->>'status'),'pending','rejeu de candidature idempotent');
select throws_ok($$select api.apply_to_club(gen_random_uuid(),'10000000-0000-4000-8000-000000000f11','Doublon')$$,
 'P0001','CONFLICT','doublon actif interdit');
reset role;

select is((select count(*)::int from private.application_events where event_type='applied'),1,'audit unique de candidature');

-- Capturer l'UUID dans le rôle de test admin : l'intrus n'a PAS le droit de lire
-- l'application, donc une sous-requête sous son JWT renverrait NULL avant la RPC.
select set_config('qa.d2_known_app_id',
  (select id::text from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f12'),true);
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f15","role":"authenticated"}';
select throws_ok($$select api.decide_application(gen_random_uuid(),
 current_setting('qa.d2_known_app_id')::uuid, 'accept')$$,
 'P0001','NOT_FOUND','intrus ne décide pas même avec UUID connu');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f11","role":"authenticated"}';
select is((api.decide_application('22222222-2222-4222-8222-22222222f011',
 (select id from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f12'),'accept')
 ->'data'->>'status'),'awaiting_player_confirmation','2 affiliations => confirmation obligatoire');
reset role;
select is((select count(*)::int from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f12' and is_active),2,
 'aucune affiliation ajoutée sans consentement');

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f12","role":"authenticated"}';
select throws_ok($$select api.confirm_membership_replacement(gen_random_uuid(),
 (select id from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f12'),
 (select id from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f12' and slot='primary'),true)$$,
 'P0001','VALIDATION','PRIMARY jamais remplacé');
select throws_ok($$select api.confirm_membership_replacement(gen_random_uuid(),
 (select id from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f12'),
 (select id from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f12' and slot='secondary'),false)$$,
 'P0001','CONSENT_REQUIRED','manager : confirmation de perte de rôle requise');
select is((api.confirm_membership_replacement('33333333-3333-4333-8333-33333333f012',
 (select id from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f12'),
 (select id from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f12' and slot='secondary'),true)
 ->'data'->>'status'),'accepted','remplacement explicitement confirmé');
reset role;
select is((select count(*)::int from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f12' and is_active),2,
 'toujours deux affiliations exactement');
select is((select count(*)::int from public.club_memberships where club_id='10000000-0000-4000-8000-000000000f11' and profile_id='00000000-0000-4000-8000-000000000f12' and role='member'),1,
 'membre rejoint le club cible');
select is((select count(*)::int from public.club_memberships where club_id='10000000-0000-4000-8000-000000000f13' and profile_id='00000000-0000-4000-8000-000000000f12' and not is_active and end_reason='replaced'),1,
 'ancien SECONDARY terminé et rôle manager perdu');
select is((select count(*)::int from private.membership_events where profile_id='00000000-0000-4000-8000-000000000f12' and event_type='replaced'),1,
 'remplacement audité');

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f15","role":"authenticated"}';
select is((api.apply_to_club('44444444-4444-4444-8444-44444444f015','10000000-0000-4000-8000-000000000f11','Bonjour')
 ->'data'->>'status'),'pending','un second joueur candidate');
select is((api.withdraw_application('55555555-5555-4555-8555-55555555f015',
 (select id from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f15'))
 ->'data'->>'status'),'withdrawn','retrait volontaire');
reset role;
select is((select count(*)::int from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f15' and status='withdrawn'),1,
 'aucun effet sur affiliations après retrait');

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f15","role":"authenticated"}';
select is((api.apply_to_club('66666666-6666-4666-8666-66666666f015','10000000-0000-4000-8000-000000000f11','Encore')
 ->'data'->>'status'),'pending','nouvelle candidature après retrait autorisée');
reset role;
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f11","role":"authenticated"}';
select is((api.decide_application('77777777-7777-4777-8777-77777777f011',
 (select id from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f15' and status='pending'),'reject')
 ->'data'->>'status'),'rejected','manager peut rejeter');
reset role;

insert into public.user_blocks(blocker_id,blocked_id) values
('00000000-0000-4000-8000-000000000f15','00000000-0000-4000-8000-000000000f11');
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f15","role":"authenticated"}';
select throws_ok($$select api.apply_to_club(gen_random_uuid(),'10000000-0000-4000-8000-000000000f11','Candidature bloquée')$$,
 'P0001','NOT_FOUND','blocage bidirectionnel : pas de nouvelle candidature');
reset role;

select * from finish();
rollback;
