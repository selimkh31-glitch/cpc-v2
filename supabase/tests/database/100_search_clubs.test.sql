-- B3 : recherche Explorer Clubs, invoker RLS et blocages. Fixtures transactionnelles uniquement.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id,email,aud,role) values
 ('00000000-0000-4000-8000-000000000d31','qa_b3_a@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000d32','qa_b3_b@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000d33','qa_b3_c@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000d34','qa_b3_d@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000d35','qa_b3_x@example.test','authenticated','authenticated');
insert into public.profiles (id,handle,platform,main_position,languages) values
 ('00000000-0000-4000-8000-000000000d31','qa_b3_a','ps5','ST','{fr}'),
 ('00000000-0000-4000-8000-000000000d32','qa_b3_b','pc','GK','{en}'),
 ('00000000-0000-4000-8000-000000000d33','qa_b3_c','ps5','CB','{fr}'),
 ('00000000-0000-4000-8000-000000000d34','qa_b3_d','ps5','CM','{fr}');
insert into public.clubs (id,name,slug,search_name,platform,languages,level,recruiting_open,
                          recruiting_positions,status,dissolved_at,created_by) values
 ('10000000-0000-4000-8000-000000000d31','Alpha FC','alpha-fc','alpha fc','ps5','{fr}','competitive',true,'{ST}','active',null,'00000000-0000-4000-8000-000000000d31'),
 ('10000000-0000-4000-8000-000000000d32','Beta Club','beta-club','beta club','pc','{en}','casual',false,'{GK}','active',null,'00000000-0000-4000-8000-000000000d32'),
 ('10000000-0000-4000-8000-000000000d33','Café Union','cafe-union','cafe union','ps5','{fr}','elite',true,'{CB}','active',null,'00000000-0000-4000-8000-000000000d33'),
 ('10000000-0000-4000-8000-000000000d34','Étoile Rouge','etoile-rouge','etoile rouge','ps5','{fr}','intermediate',true,'{CM}','active',null,'00000000-0000-4000-8000-000000000d34'),
 ('10000000-0000-4000-8000-000000000d35','Delta Ancien','delta-ancien','delta ancien','ps5','{fr}','casual',true,'{}','dissolved',now(),'00000000-0000-4000-8000-000000000d31');
insert into public.club_memberships (club_id,profile_id,slot,role,is_active,ended_at,end_reason) values
 ('10000000-0000-4000-8000-000000000d31','00000000-0000-4000-8000-000000000d31','primary','owner',true,null,null),
 ('10000000-0000-4000-8000-000000000d32','00000000-0000-4000-8000-000000000d32','primary','owner',true,null,null),
 ('10000000-0000-4000-8000-000000000d33','00000000-0000-4000-8000-000000000d33','primary','owner',true,null,null),
 ('10000000-0000-4000-8000-000000000d34','00000000-0000-4000-8000-000000000d34','primary','owner',true,null,null),
 ('10000000-0000-4000-8000-000000000d35','00000000-0000-4000-8000-000000000d31','secondary','owner',false,now(),'club_dissolved');
-- D a bloqué C : c'est un filtre RLS, pas un filtre d'interface.
insert into public.user_blocks (blocker_id,blocked_id) values
 ('00000000-0000-4000-8000-000000000d34','00000000-0000-4000-8000-000000000d33');

select ok(not has_function_privilege('anon',
 'api.search_clubs(text,public.platform,boolean,public.position_code,text[],public.club_level,boolean,text,uuid,integer)','EXECUTE'),
 'R2 : anon ne peut pas appeler la recherche');
select ok(has_function_privilege('authenticated',
 'api.search_clubs(text,public.platform,boolean,public.position_code,text[],public.club_level,boolean,text,uuid,integer)','EXECUTE'),
 'R2 : appel autorisé aux authentifiés');
select ok(not (select prosecdef from pg_proc where oid=
 'api.search_clubs(text,public.platform,boolean,public.position_code,text[],public.club_level,boolean,text,uuid,integer)'::regprocedure),
 'Recherche SECURITY INVOKER : RLS non contournée');

set local role anon;
select throws_ok($$select api.search_clubs()$$,'42501',null,'anon : RPC inaccessible');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000d35","role":"authenticated"}';
select throws_ok($$select api.search_clubs()$$,'P0001','UNAUTHENTICATED','Utilisateur non onboardé interdit');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000d34","role":"authenticated"}';
select is((select jsonb_array_length(api.search_clubs(null,null,false)->'data'->'items')),3,
 'D voit seulement 3 clubs actifs non bloqués (C bloqué, dissous exclu)');
select is((api.search_clubs()->'data'->'items'->0->>'name'),'Alpha FC',
 'Tri : clubs qui recrutent d’abord puis nom');
select is((select jsonb_array_length(api.search_clubs()->'data'->'items')),2,
 'Recrutement ouvert par défaut : 2 clubs visibles');
select is((api.search_clubs(null,null,false)->'data'->'items'->2->>'name'),'Beta Club',
 'Club fermé arrive après les clubs ouverts');
select is((select jsonb_array_length(api.search_clubs('ÉTOILE')->'data'->'items')),1,
 'Recherche insensible aux accents et majuscules');
select is((select jsonb_array_length(api.search_clubs(null,'pc',false)->'data'->'items')),1,
 'Filtre plateforme');
select is((select jsonb_array_length(api.search_clubs(null,null,true,'CM')->'data'->'items')),1,
 'Filtre poste recherché');
select is((select jsonb_array_length(api.search_clubs(null,null,false,null,'{en}')->'data'->'items')),1,
 'Filtre langues');
select is((select jsonb_array_length(api.search_clubs(null,null,true,null,null,'competitive')->'data'->'items')),1,
 'Filtre niveau déclaré');
select ok((api.search_clubs(null,null,true,null,null,null,null,null,null,1)->'data'->>'next_cursor') is not null,
 'Page 1 : curseur présent si résultat supplémentaire');
select is((api.search_clubs(null,null,true,null,null,null,true,'alpha fc',
  '10000000-0000-4000-8000-000000000d31',1)->'data'->'items'->0->>'name'),'Étoile Rouge',
 'Page 2 : reprise après le dernier club affiché');
select throws_ok($$select api.search_clubs(null,null,true,null,null,null,null,null,null,21)$$,
 'P0001','VALIDATION','R4 : limite plafonnée à 20');
select throws_ok($$select api.search_clubs(repeat('x',33))$$,
 'P0001','VALIDATION','R4 : recherche trop longue refusée');
reset role;

select * from finish();
rollback;
