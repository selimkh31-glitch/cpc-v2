-- Invariants globaux de sécurité (ADR-0004 R2/R3, ADR-0011 P2/P4/P5).
-- Valables dès maintenant (base vide) et pour toutes les migrations futures.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- P2 : toute table des schémas exposés a la RLS activée.
select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'api') and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0,
  'P2 — RLS activée sur toutes les tables de public et api'
);

-- R3 / P5 : les fonctions SECURITY DEFINER de api et private ont search_path = ''.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('api', 'private') and p.prosecdef
      and not ('search_path=""' = any (coalesce(p.proconfig, '{}')) or 'search_path=' = any (coalesce(p.proconfig, '{}')))),
  0,
  'R3 — search_path vide sur toutes les fonctions SECURITY DEFINER de api et private'
);

-- R3 / P5 : toute fonction SECURITY DEFINER de public fixe un search_path.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
  0,
  'R3 — search_path fixé sur toutes les fonctions SECURITY DEFINER de public'
);

-- R2 / P4 : aucune fonction de api ou private exécutable par anon.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('api', 'private') and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'R2 — aucune fonction api/private exécutable par anon'
);

-- R2 / P4 : aucune fonction de private exécutable par authenticated.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  0,
  'R2 — aucune fonction private exécutable par authenticated'
);

-- R2 / P4 : aucune fonction SECURITY DEFINER de public exécutable par anon (cf. D-38).
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'R2 — aucune fonction SECURITY DEFINER de public exécutable par anon'
);

select * from finish();
rollback;
