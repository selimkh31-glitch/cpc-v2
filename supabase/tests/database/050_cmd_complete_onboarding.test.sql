-- S-1.6 — api.complete_onboarding : Definition of Done ADR-0004 (R1 autorisation, R2 EXECUTE, R3 search_path, R4 abus).
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000e1', 'qa_onb_a@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e2', 'qa_onb_b@example.test', 'authenticated', 'authenticated');

-- R2 / R3
select ok(not has_function_privilege('anon', 'api.complete_onboarding(uuid,text,public.platform,public.position_code,public.position_code[],boolean)', 'EXECUTE'),
  'R2 — anon ne peut pas exécuter la commande');
select ok(has_function_privilege('authenticated', 'api.complete_onboarding(uuid,text,public.platform,public.position_code,public.position_code[],boolean)', 'EXECUTE'),
  'R2 — authenticated peut exécuter la commande');
select ok(not has_function_privilege('service_role', 'api.complete_onboarding(uuid,text,public.platform,public.position_code,public.position_code[],boolean)', 'EXECUTE'),
  'R2 — service_role ne peut pas exécuter la commande');
select ok(
  (select 'search_path=""' = any (proconfig) and prosecdef from pg_proc
    where oid = 'api.complete_onboarding(uuid,text,public.platform,public.position_code,public.position_code[],boolean)'::regprocedure),
  'R3 — SECURITY DEFINER avec search_path vide'
);

-- R1 : anonyme refusé ; authentifié sans identité refusé.
set local role anon;
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa_anon', 'pc', 'ST')$$, '42501', null, 'R1 — anon refusé');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa_nouid', 'pc', 'ST', '{}', true)$$, 'P0001', 'UNAUTHENTICATED', 'R1 — JWT sans sujet refusé');

-- R1 : chemin nominal pour A.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select is(
  api.complete_onboarding('11111111-1111-4111-8111-111111111111', '  QA_Alpha  ', 'ps5', 'ST', '{CF,LW}', true) ->> 'handle',
  'qa_alpha',
  'R1 — onboarding de A réussi (pseudo normalisé en minuscules)'
);
select is((select count(*)::int from public.profile_positions where profile_id = '00000000-0000-4000-8000-0000000000e1'), 2, 'R1 — 2 postes secondaires enregistrés');
select is((select age_threshold from public.account_settings where profile_id = '00000000-0000-4000-8000-0000000000e1'), 18::smallint, 'R1 — seuil d''âge 18 consigné (D-12)');

-- R4 : rejeu du même request_id → même réponse, aucune nouvelle écriture.
select is(
  api.complete_onboarding('11111111-1111-4111-8111-111111111111', 'qa_autre', 'pc', 'GK', '{}', true) ->> 'handle',
  'qa_alpha',
  'R4 — rejeu idempotent : réponse initiale renvoyée'
);
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000000e1'), 1, 'R4 — aucun doublon après rejeu');

-- R4 : second onboarding avec un autre request_id → ALREADY_HANDLED.
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa_alpha2', 'pc', 'GK', '{}', true)$$, 'P0001', 'ALREADY_HANDLED', 'R4 — second onboarding refusé');

-- R4 : abus et validations pour B.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}';
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'QA_ALPHA', 'pc', 'GK', '{}', true)$$, 'P0001', 'CONFLICT', 'R4 — pseudo déjà pris (casse ignorée)');
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'x', 'pc', 'GK', '{}', true)$$, 'P0001', 'VALIDATION', 'R4 — pseudo trop court');
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa bravo!', 'pc', 'GK', '{}', true)$$, 'P0001', 'VALIDATION', 'R4 — pseudo avec caractères interdits');
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa_bravo', 'pc', 'GK', '{}', false)$$, 'P0001', 'VALIDATION', 'R4 — déclaration d''âge absente');
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa_bravo', 'pc', 'GK', '{GK}', true)$$, 'P0001', 'VALIDATION', 'R4 — poste secondaire égal au principal');
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa_bravo', 'pc', 'GK', '{CB,LB,RB,CDM}', true)$$, 'P0001', 'VALIDATION', 'R4 — plus de 3 postes secondaires');
select throws_ok($$select api.complete_onboarding(gen_random_uuid(), 'qa_bravo', 'pc', 'GK', '{CB,CB}', true)$$, 'P0001', 'VALIDATION', 'R4 — postes secondaires en double');
select throws_ok($$select api.complete_onboarding(null, 'qa_bravo', 'pc', 'GK', '{}', true)$$, 'P0001', 'VALIDATION', 'R4 — request_id absent');
reset role;

-- R4 : aucune écriture partielle pour B après les refus ; A n'a pas été modifié par B.
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000000e2'), 0, 'R4 — aucun profil partiel pour B');
select is((select handle::text from public.profiles where id = '00000000-0000-4000-8000-0000000000e1'), 'qa_alpha', 'R4 — profil de A intact');

select * from finish();
rollback;
