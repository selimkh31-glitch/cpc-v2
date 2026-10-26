-- D-38 : durcissement de public.rls_auto_enable() et non-régression de ensure_rls (RA-1 → RA-4).
-- RA-5 (advisors staging = 0) est vérifié sur le staging après application (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_function('public', 'rls_auto_enable', 'D-38 — la fonction de plateforme est conservée');

select ok(
  exists (select 1 from pg_event_trigger where evtname = 'ensure_rls' and evtenabled <> 'D'),
  'RA-4 — l''event trigger ensure_rls existe toujours et reste actif'
);

select ok(not has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE'), 'RA-1 — anon n''a plus EXECUTE');
select ok(not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE'), 'RA-1 — authenticated n''a plus EXECUTE');
select ok(not has_function_privilege('service_role', 'public.rls_auto_enable()', 'EXECUTE'), 'RA-1 — service_role n''a plus EXECUTE');

-- RA-2 : un appel direct échoue (anon : permission refusée).
set local role anon;
select throws_ok('select public.rls_auto_enable()', '42501', null, 'RA-2 — appel direct refusé à anon');
reset role;

-- RA-3 : après durcissement, une table créée dans public reçoit toujours la RLS automatiquement.
create table public.qa_d38_probe (id int);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.qa_d38_probe'::regclass),
  'RA-3 — ensure_rls active toujours la RLS sur une nouvelle table de public'
);

select is(
  obj_description('public.rls_auto_enable()'::regprocedure, 'pg_proc') like 'Fonction de plateforme Supabase%',
  true,
  'D-38 — commentaire documentant la décision et le rollback'
);

select * from finish();
rollback;
