-- CPC V2 / P2-D2 : limites de rôle, capacité, expiration et idempotence.
-- Fixtures locales transactionnelles exclusivement.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users(id,email,aud,role) values
('00000000-0000-4000-8000-000000000f21','qa_d2a@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000f22','qa_d2x@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000f23','qa_d2e@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000f24','qa_d2f@example.test','authenticated','authenticated');
insert into public.profiles(id,handle,platform,main_position,languages) values
('00000000-0000-4000-8000-000000000f21','qa_d2a','ps5','GK','{fr}'),
('00000000-0000-4000-8000-000000000f22','qa_d2x','ps5','CB','{fr}'),
('00000000-0000-4000-8000-000000000f23','qa_d2e','ps5','ST','{fr}'),
('00000000-0000-4000-8000-000000000f24','qa_d2f','ps5','CM','{fr}');
insert into public.clubs(id,name,slug,search_name,platform,languages,level,recruiting_open,created_by) values
('10000000-0000-4000-8000-000000000f21','QA D2 Main','qa-d2-main','qa d2 main','ps5','{fr}','casual',true,'00000000-0000-4000-8000-000000000f21'),
('10000000-0000-4000-8000-000000000f22','QA D2 Old A','qa-d2-old-a','qa d2 old a','ps5','{fr}','casual',false,'00000000-0000-4000-8000-000000000f22'),
('10000000-0000-4000-8000-000000000f23','QA D2 Old B','qa-d2-old-b','qa d2 old b','ps5','{fr}','casual',false,'00000000-0000-4000-8000-000000000f23');
insert into public.club_memberships(club_id,profile_id,slot,role) values
('10000000-0000-4000-8000-000000000f21','00000000-0000-4000-8000-000000000f21','primary','owner'),
('10000000-0000-4000-8000-000000000f22','00000000-0000-4000-8000-000000000f22','primary','owner'),
('10000000-0000-4000-8000-000000000f22','00000000-0000-4000-8000-000000000f23','primary','member'),
('10000000-0000-4000-8000-000000000f23','00000000-0000-4000-8000-000000000f23','secondary','owner');

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f24","role":"authenticated"}';
select is((api.apply_to_club('11111111-1111-4111-8111-11111111f024',
 '10000000-0000-4000-8000-000000000f21','Bonjour')->'data'->>'status'),
 'pending','F sans club : candidature initiale');
reset role;

select set_config('qa.d2e_f_app',(
 select id::text from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f24'),true);
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f21","role":"authenticated"}';
select is((api.decide_application('22222222-2222-4222-8222-22222222f021',
 current_setting('qa.d2e_f_app')::uuid,'accept')->'data'->>'status'),
 'accepted','aucune affiliation : acceptation immédiate');
select is((api.decide_application('22222222-2222-4222-8222-22222222f021',
 current_setting('qa.d2e_f_app')::uuid,'accept')->'data'->>'status'),
 'accepted','décision idempotente');
reset role;
select is((select count(*)::int from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f24' and is_active),1,
 'exactement une affiliation après deux appels');
select is((select count(*)::int from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f24' and slot='primary' and role='member'),1,
 'slot PRIMARY attribué automatiquement seulement si libre');
select is((select count(*)::int from private.membership_events
 where profile_id='00000000-0000-4000-8000-000000000f24' and event_type='joined'),1,
 'audit joined une seule fois');

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f24","role":"authenticated"}';
select throws_ok($$select api.withdraw_application(gen_random_uuid(),
 current_setting('qa.d2e_f_app')::uuid)$$,'P0001','ALREADY_HANDLED',
 'le joueur ne peut pas retirer une candidature déjà acceptée');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f23","role":"authenticated"}';
select is((api.apply_to_club('33333333-3333-4333-8333-33333333f023',
 '10000000-0000-4000-8000-000000000f21','Je candidate')->'data'->>'status'),
 'pending','E avec deux clubs peut candidater sans remplacement automatique');
reset role;
select set_config('qa.d2e_e_app',(
 select id::text from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f23'),true);

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f22","role":"authenticated"}';
select throws_ok($$select api.decide_application(gen_random_uuid(),
 current_setting('qa.d2e_e_app')::uuid,'accept')$$,'P0001','NOT_FOUND',
 'le propriétaire d un autre club ne peut pas statuer');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f21","role":"authenticated"}';
select is((api.decide_application('44444444-4444-4444-8444-44444444f021',
 current_setting('qa.d2e_e_app')::uuid,'accept')->'data'->>'status'),
 'awaiting_player_confirmation','2 slots : acceptation ne remplace rien');
reset role;
select is((select count(*)::int from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f23' and is_active),2,
 'les affiliations existantes restent actives');

select set_config('qa.d2e_second',(
 select id::text from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f23' and slot='secondary'),true);
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f23","role":"authenticated"}';
select throws_ok($$select api.confirm_membership_replacement(gen_random_uuid(),
 current_setting('qa.d2e_e_app')::uuid,current_setting('qa.d2e_second')::uuid,true)$$,
 'P0001','OWNER_MUST_TRANSFER','OWNER SECONDARY doit d abord transférer son club');
reset role;
select is((select count(*)::int from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f23' and is_active),2,
 'aucune affiliation supprimée lors du refus OWNER');
select is((select count(*)::int from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f23'
 and club_id='10000000-0000-4000-8000-000000000f23' and is_active and role='owner'),1,
 'OWNER préservé dans le club secondaire');

update public.club_applications set expires_at=now()-interval '1 minute'
where id=current_setting('qa.d2e_e_app')::uuid;
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000f23","role":"authenticated"}';
select throws_ok($$select api.confirm_membership_replacement(gen_random_uuid(),
 current_setting('qa.d2e_e_app')::uuid,current_setting('qa.d2e_second')::uuid,true)$$,
 'P0001','EXPIRED','une confirmation après expiration est interdite');
reset role;
select * from finish();
rollback;
