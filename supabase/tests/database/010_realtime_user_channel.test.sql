-- ADR-0008 / ADR-0011 P8 : périmètre des policies Realtime.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  exists (select 1 from pg_policies
           where schemaname = 'realtime' and tablename = 'messages'
             and policyname = 'realtime_user_channel_select_own'
             and cmd = 'SELECT' and roles = '{authenticated}'),
  'P8 — policy SELECT user:{uid} présente, réservée à authenticated'
);

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'realtime' and tablename = 'messages'
      and (roles && '{anon,public}'::name[])),
  0,
  'P8 — aucune policy Realtime accordée à anon ou public'
);

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'realtime' and tablename = 'messages' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')),
  0,
  'P8 — aucune émission Realtime autorisée côté client'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'realtime.messages'::regclass),
  'P8 — RLS active sur realtime.messages'
);

select * from finish();
rollback;
