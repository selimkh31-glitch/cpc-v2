-- D-40 : vérification de session active (R1 autorisation, R2 EXECUTE, R3 search_path, R4 abus).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000d1', 'qa_d40@example.test', 'authenticated', 'authenticated');
insert into auth.sessions (id, user_id) values
  ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000d1'),
  ('00000000-0000-4000-8000-00000000005b', '00000000-0000-4000-8000-0000000000d1');

-- R2 / R3
select ok(not has_function_privilege('anon', 'api.assert_session_active()', 'EXECUTE'), 'R2 — anon ne peut pas appeler assert_session_active');
select ok(has_function_privilege('authenticated', 'api.assert_session_active()', 'EXECUTE'), 'R2 — authenticated peut appeler assert_session_active');
select ok(not has_function_privilege('authenticated', 'private.session_is_active(uuid)', 'EXECUTE'), 'R2 — fonction interne non appelable par authenticated');
select ok(
  (select 'search_path=""' = any (proconfig) from pg_proc where oid = 'api.assert_session_active()'::regprocedure),
  'R3 — search_path vide'
);

set local role authenticated;

-- R1 : session existante → vrai.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated","session_id":"00000000-0000-4000-8000-00000000005a"}';
select is(api.assert_session_active(), true, 'R1 — session active reconnue');

-- R4 : session inexistante (révoquée / forgée) → faux.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated","session_id":"00000000-0000-4000-8000-0000000000ff"}';
select is(api.assert_session_active(), false, 'R4 — session inconnue refusée');

-- R4 : JWT sans session_id ou malformé → faux.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}';
select is(api.assert_session_active(), false, 'R4 — JWT sans session_id refusé');
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated","session_id":"pas-un-uuid"}';
select is(api.assert_session_active(), false, 'R4 — session_id malformé refusé');
reset role;

-- Révocation : suppression de la session (ce que fait une déconnexion globale) → refus immédiat.
delete from auth.sessions where id = '00000000-0000-4000-8000-00000000005b';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated","session_id":"00000000-0000-4000-8000-00000000005b"}';
select is(api.assert_session_active(), false, 'A5b (base) — session révoquée refusée immédiatement, JWT encore valide');
reset role;

-- Expiration forcée (not_after dépassé) → faux.
update auth.sessions set not_after = now() - interval '1 minute' where id = '00000000-0000-4000-8000-00000000005a';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated","session_id":"00000000-0000-4000-8000-00000000005a"}';
select is(api.assert_session_active(), false, 'R4 — session au-delà de not_after refusée');
reset role;

select * from finish();
rollback;
