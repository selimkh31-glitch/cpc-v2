-- S-1.3 — Fondations : schémas, extensions, privilèges par défaut, enums (ADR-0003, D-14, D-15).

-- Schémas (ADR-0003) : `api` pour les futures RPC exposées, `private` jamais exposé.
create schema if not exists api;
create schema if not exists private;
revoke all on schema api from public;
revoke all on schema private from public;
grant usage on schema api to authenticated;

create extension if not exists citext with schema extensions;

-- Privilèges par défaut restrictifs : tout nouvel objet est fermé à anon et authenticated
-- tant qu'un GRANT explicite ne l'ouvre pas (RLS + privilèges explicitement revus).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema api revoke execute on functions from public, anon;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

-- Référentiels (D-15 plateformes, D-14 postes : 15 codes, 4 groupes).
create type public.platform as enum ('ps5', 'xbox_series', 'pc');
create type public.position_code as enum (
  'GK',
  'RB', 'LB', 'CB', 'RWB', 'LWB',
  'CDM', 'CM', 'CAM', 'RM', 'LM',
  'RW', 'LW', 'CF', 'ST'
);
create type public.position_group as enum ('GK', 'DEF', 'MID', 'ATT');

create function public.position_group_of(p public.position_code)
  returns public.position_group
  language sql
  immutable
  strict
  set search_path = ''
as $$
  select case
    when p = 'GK' then 'GK'
    when p in ('RB', 'LB', 'CB', 'RWB', 'LWB') then 'DEF'
    when p in ('CDM', 'CM', 'CAM', 'RM', 'LM') then 'MID'
    else 'ATT'
  end::public.position_group
$$;
revoke execute on function public.position_group_of(public.position_code) from public, anon;
grant execute on function public.position_group_of(public.position_code) to authenticated;

-- Horodatage de mise à jour (trigger interne, non appelable par les clients).
create function private.set_updated_at()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
revoke execute on function private.set_updated_at() from public, anon, authenticated;
