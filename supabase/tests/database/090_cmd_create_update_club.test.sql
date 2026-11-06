-- B2 : créations et mises à jour de club, R1–R4, idempotence et limites D-21.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id,email,aud,role) values
 ('00000000-0000-4000-8000-000000000b31','qa_b2_cmd_a@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000b32','qa_b2_cmd_b@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000b33','qa_b2_cmd_c@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000b34','qa_b2_cmd_d@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000b35','qa_b2_cmd_x@example.test','authenticated','authenticated');
insert into public.profiles(id,handle,platform,main_position,languages) values
 ('00000000-0000-4000-8000-000000000b31','qa_b2_cma','ps5','ST','{fr}'),
 ('00000000-0000-4000-8000-000000000b32','qa_b2_cmb','ps5','CB','{fr}'),
 ('00000000-0000-4000-8000-000000000b33','qa_b2_cmc','pc','GK','{en}'),
 ('00000000-0000-4000-8000-000000000b34','qa_b2_cmd','ps5','CM','{fr}');

-- R2/R3 et normalisation D-48, testées contre les mêmes vecteurs que Vitest.
select ok(not has_function_privilege('anon','api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[])','EXECUTE'),
  'R2 : anon ne peut créer de club');
select ok(has_function_privilege('authenticated','api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[])','EXECUTE'),
  'R2 : authenticated peut créer un club');
select ok(not has_function_privilege('service_role','api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[])','EXECUTE'),
  'R2 : service_role ne peut utiliser la commande');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='api' and p.proname in ('create_club','update_club')
 and p.prosecdef and 'search_path=""'=any(p.proconfig)),2,
  'R3 : deux commandes SECURITY DEFINER à search_path vide');
select is(private.normalize_search('ÀÉÎÕÜ'),'aeiou','D-48 : accents majuscules');
select is(private.normalize_search('Cœur de Lion'),'coeur de lion','D-48 : ligature œ');
select is(private.normalize_search('Straße 11'),'strasse 11','D-48 : ß');
select is(private.club_slug('  Les   Canaris  '),'les-canaris','D-48 : espaces et slug');
select is(private.club_slug('Étoile Rouge'),'etoile-rouge','D-48 : slug accents');

-- R1 : non onboardé.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b35","role":"authenticated"}';
select throws_ok($$select api.create_club(gen_random_uuid(),'Un Club',null,'ps5','{fr}','casual',true,'{GK}')$$,
  'P0001','UNAUTHENTICATED','R1 : non onboardé interdit');
reset role;

-- A : création normale, idempotence, validations, limitation 24 h.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b31","role":"authenticated"}';
select is((api.create_club('11111111-1111-4111-8111-11111111b031','Étoile Rouge',
  'Club compétitif','ps5','{fr,en}','competitive',true,'{GK,CB}') -> 'data' ->> 'slug'),
  'etoile-rouge','A : création avec slug normalisé');
select is((api.create_club('11111111-1111-4111-8111-11111111b031','Nom différent',
  null,'pc','{en}','casual',false,'{}') -> 'data' ->> 'slug'),
  'etoile-rouge','A : rejeu du request_id sans double effet');
select is((select count(*)::int from public.clubs where created_by = '00000000-0000-4000-8000-000000000b31'),1,
  'A : une seule ligne club');
select is((select role::text from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000b31'),
  'owner','A : OWNER imposé par le serveur');
select is((select slot::text from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000b31'),
  'primary','A : PRIMARY attribué');
select throws_ok($$select api.create_club(gen_random_uuid(),'Deuxième Club',null,'ps5','{fr}','casual',true,'{}')$$,
  'P0001','RATE_LIMITED','D-21 : seconde création avant 24 h refusée');
select throws_ok($$select api.create_club(null,'Sans Request',null,'ps5','{fr}','casual',true,'{}')$$,
  'P0001','VALIDATION','R4 : request_id obligatoire');
select throws_ok($$select api.create_club(gen_random_uuid(),'Club',null,'ps5','{fr,fr}','casual',true,'{}')$$,
  'P0001','VALIDATION','R4 : langues dupliquées refusées');
reset role;
select is((select count(*)::int from private.membership_events where profile_id='00000000-0000-4000-8000-000000000b31'),1,
  'A : événement joined écrit une seule fois (lecture admin de test uniquement)');

-- B : rejet nom pris (casse/accents), puis création valide.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b32","role":"authenticated"}';
select throws_ok($$select api.create_club(gen_random_uuid(),'Etoile Rouge',null,'ps5','{fr}','casual',true,'{}')$$,
  'P0001','CONFLICT','D-48 : nom équivalent déjà pris');
select is((api.create_club('22222222-2222-4222-8222-22222222b032','Boreal FC',
  null,'ps5','{fr}','casual',true,'{ST}') -> 'data' ->> 'slot'),
  'primary','B : première affiliation PRIMARY');
select throws_ok($$select api.update_club(gen_random_uuid(),
  (select id from public.clubs where slug='etoile-rouge'),now(),'Intrusion',null,null,null,null)$$,
  'P0001','FORBIDDEN','B : aucun droit d''édition du club de A');
reset role;

-- Fixtures : C a déjà un PRIMARY ; D possède deux affiliations actives.
insert into public.clubs(id,name,slug,search_name,platform,languages,level,recruiting_open,created_by)
values('10000000-0000-4000-8000-000000000b34','Club Gamma','club-gamma','club gamma',
       'ps5','{fr}','casual',false,'00000000-0000-4000-8000-000000000b32');
insert into public.club_memberships(club_id,profile_id,slot,role)
values((select id from public.clubs where slug='boreal-fc'),
       '00000000-0000-4000-8000-000000000b33','primary','member'),
      ((select id from public.clubs where slug='boreal-fc'),
       '00000000-0000-4000-8000-000000000b34','primary','member'),
      ('10000000-0000-4000-8000-000000000b34',
       '00000000-0000-4000-8000-000000000b34','secondary','member');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b33","role":"authenticated"}';
select is((api.create_club('33333333-3333-4333-8333-33333333b033','Club Secondaire',
  null,'pc','{en}','elite',false,'{}') -> 'data' ->> 'slot'),
  'secondary','C : un PRIMARY existant donne SECONDARY');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b34","role":"authenticated"}';
select throws_ok($$select api.create_club(gen_random_uuid(),'Club Troisième',null,'ps5','{fr}','casual',true,'{}')$$,
  'P0001','LIMIT_REACHED','D : deux slots occupés = LIMIT_REACHED');
reset role;

-- A peut modifier son club ; protection contre conflit, vidage description et rejeu.
select set_config('qa.b2_expected_at',
  (select updated_at::text from public.clubs where slug='etoile-rouge'),true);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000b31","role":"authenticated"}';
select is((api.update_club('44444444-4444-4444-8444-44444444b031',
  (select id from public.clubs where slug='etoile-rouge'),
  current_setting('qa.b2_expected_at')::timestamptz,
  null,null,null,false,'{ST}') -> 'data' ->> 'club_id'),
  (select id::text from public.clubs where slug='etoile-rouge'),
  'A : modification du recrutement par OWNER');
select is((select recruiting_open from public.clubs where slug='etoile-rouge'),false,
  'A : recrute fermé après modification');
select throws_ok($$select api.update_club(gen_random_uuid(),
  (select id from public.clubs where slug='etoile-rouge'),
  current_setting('qa.b2_expected_at')::timestamptz,
  null,null,null,true,null)$$,
  'P0001','CONFLICT','A : verrou optimiste bloque une édition périmée');
select is((api.update_club('44444444-4444-4444-8444-44444444b031',
  (select id from public.clubs where slug='etoile-rouge'),
  current_setting('qa.b2_expected_at')::timestamptz,
  null,null,null,false,'{ST}') -> 'data' ->> 'club_id'),
  (select id::text from public.clubs where slug='etoile-rouge'),
  'A : rejeu exact de modification accepté malgré horodatage périmé');
select lives_ok($$select api.update_club(gen_random_uuid(),
  (select id from public.clubs where slug='etoile-rouge'),
  (select updated_at from public.clubs where slug='etoile-rouge'),
  '',null,null,null,null)$$,
  'A : description vide supprime la description');
select is((select description from public.clubs where slug='etoile-rouge'),null::text,
  'A : description désormais NULL après demande explicite');
reset role;

select * from finish();
rollback;
