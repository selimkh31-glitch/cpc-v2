-- CPC V2 / P2-D1 : matriciel RLS candidatures, aucune donnée durable.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id,email,aud,role) values
('00000000-0000-4000-8000-000000000e11','d1_owner@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000e12','d1_candidat@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000e13','d1_intrus@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000e14','d1_manager@example.test','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000e15','d1_bloque@example.test','authenticated','authenticated');
insert into public.profiles(id,handle,platform,main_position,languages) values
('00000000-0000-4000-8000-000000000e11','qa_d1_owner','ps5','GK','{fr}'),
('00000000-0000-4000-8000-000000000e12','qa_d1_candidate','ps5','ST','{fr}'),
('00000000-0000-4000-8000-000000000e13','qa_d1_other','pc','CM','{en}'),
('00000000-0000-4000-8000-000000000e14','qa_d1_manager','ps5','CB','{fr}'),
('00000000-0000-4000-8000-000000000e15','qa_d1_blocked','ps5','ST','{fr}');

insert into public.clubs(id,name,slug,search_name,platform,languages,level,recruiting_open,created_by)
values ('10000000-0000-4000-8000-000000000e11','QA D1 Club','qa-d1-club','qa d1 club','ps5','{fr}','casual',true,
'00000000-0000-4000-8000-000000000e11');
insert into public.club_memberships(club_id,profile_id,slot,role) values
('10000000-0000-4000-8000-000000000e11','00000000-0000-4000-8000-000000000e11','primary','owner'),
('10000000-0000-4000-8000-000000000e11','00000000-0000-4000-8000-000000000e14','primary','manager');

insert into public.club_applications(id,club_id,profile_id,message,status,expires_at) values
('20000000-0000-4000-8000-000000000e12','10000000-0000-4000-8000-000000000e11',
'00000000-0000-4000-8000-000000000e12','Bonjour','pending',now()+interval '14 days'),
('20000000-0000-4000-8000-000000000e15','10000000-0000-4000-8000-000000000e11',
'00000000-0000-4000-8000-000000000e15',null,'pending',now()+interval '14 days');

select ok((select relrowsecurity from pg_class where oid='public.club_applications'::regclass),'RLS active');
select ok(not has_table_privilege('anon','public.club_applications','SELECT'),'anon sans lecture');
select ok(not has_table_privilege('anon','public.club_applications','INSERT'),'anon sans écriture');
select ok(has_table_privilege('authenticated','public.club_applications','SELECT'),'auth peut tenter SELECT sous RLS');
select ok(not has_table_privilege('authenticated','public.club_applications','INSERT'),'pas d INSERT direct');
select ok(not has_table_privilege('authenticated','public.club_applications','UPDATE'),'pas d UPDATE direct');
select ok(not has_table_privilege('authenticated','public.club_applications','DELETE'),'pas de DELETE direct');
select ok(not has_function_privilege('anon','rls_policies.can_see_club_application(uuid)','EXECUTE'),
'anon ne peut exécuter la policy helper');
select ok(has_function_privilege('authenticated','rls_policies.can_see_club_application(uuid)','EXECUTE'),
'auth peut exécuter le predicate RLS sous le schéma non exposé');
select ok((select prosecdef from pg_proc where oid='rls_policies.can_see_club_application(uuid)'::regprocedure),
'helper est SECURITY DEFINER');
select is((select count(*)::int from pg_proc where oid='rls_policies.can_see_club_application(uuid)'::regprocedure
and 'search_path=""'=any(proconfig)),1,'chemin de recherche vide');
select is((select count(*)::int from public.club_applications),2,'deux fixtures créées');
select is((select count(*)::int from public.club_applications where status='pending'),2,'fixtures en attente');
select is((select extract(day from expires_at - created_at)::int from public.club_applications
where id='20000000-0000-4000-8000-000000000e12'),14,'D-22 : expiration 14 jours');

set local role anon;
select throws_ok($$select count(*) from public.club_applications$$,
  '42501',null,'anon : table inaccessible sans GRANT SELECT');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000e12","role":"authenticated"}';
select is((select count(*)::int from public.club_applications),1,'candidat voit sa candidature uniquement');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000e13","role":"authenticated"}';
select is((select count(*)::int from public.club_applications),0,'intrus ne voit aucune candidature');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000e11","role":"authenticated"}';
select is((select count(*)::int from public.club_applications),2,'owner voit les demandes de son club');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000e14","role":"authenticated"}';
select is((select count(*)::int from public.club_applications),2,'manager voit les demandes');
reset role;

insert into public.user_blocks(blocker_id,blocked_id) values
('00000000-0000-4000-8000-000000000e15','00000000-0000-4000-8000-000000000e14');
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000e14","role":"authenticated"}';
select is((select count(*)::int from public.club_applications),1,'blocage masque la candidature au manager');
reset role;

select throws_ok($$insert into public.club_applications(club_id,profile_id,status) values
('10000000-0000-4000-8000-000000000e11','00000000-0000-4000-8000-000000000e12','pending')$$,
'23505',null,'unique partiel : pas de seconde candidature active');
select * from finish();
rollback;
