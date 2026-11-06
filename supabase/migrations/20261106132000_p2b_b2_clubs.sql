-- CPC V2 · P2-B / B2 : clubs et affiliations (docs/26, D-21, D-23, D-45).
-- Migration additive sur le STAGING V2 uniquement ; aucune donnée utilisateur préchargée.
-- Les contraintes différables permettent plus tard les échanges PRIMARY/SECONDARY et OWNER.

create extension if not exists btree_gist with schema extensions;

create type public.club_level as enum ('casual', 'intermediate', 'competitive', 'elite');
create type public.club_role as enum ('owner', 'manager', 'member');
create type public.membership_slot as enum ('primary', 'secondary');
create type public.membership_end_reason as enum
  ('left', 'removed', 'replaced', 'club_dissolved', 'account_deleted');

-- La normalisation D-48 est sans extension unaccent/pg_trgm.
-- Lower C est ASCII ; translate traite explicitement les caractères accentués en majuscules.
create function private.normalize_search(p_text text)
  returns text language plpgsql immutable set search_path = ''
as $$
declare
  s text;
begin
  if p_text is null then return null; end if;
  s := pg_catalog.translate(p_text,
    'ÀÁÂÃÄÅĀÇĆČÈÉÊËĒĖĘÌÍÎÏĪÑŃÒÓÔÕÖØŌÙÚÛÜŪÝŸŽŹŻŠŚÆŒẞ',
    'àáâãäåāçćčèéêëēėęìíîïīñńòóôõöøōùúûüūýÿžźżšśæœß');
  s := pg_catalog.lower(s collate "C");
  s := pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(s, 'œ', 'oe'), 'æ', 'ae'), 'ß', 'ss');
  s := pg_catalog.translate(s,
    'àáâãäåāçćčèéêëēėęìíîïīñńòóôõöøōùúûüūýÿžźżšś',
    'aaaaaaaccceeeeeeeiiiiinnooooooouuuuuyyzzzss');
  return pg_catalog.btrim(pg_catalog.regexp_replace(s, '[[:space:]]+', ' ', 'g'));
end
$$;

create function private.club_slug(p_name text)
  returns text language sql immutable set search_path = ''
as $$
  select pg_catalog.btrim(
    pg_catalog.regexp_replace(private.normalize_search(p_name), '[^a-z0-9]+', '-', 'g'),
    '-')
$$;

create function private.valid_club_languages(p_lang text[])
  returns boolean language sql immutable set search_path = ''
as $$
  select p_lang is not null
    and pg_catalog.cardinality(p_lang) between 1 and 3
    and not exists (select 1 from pg_catalog.unnest(p_lang) as l(v)
                    where l.v is null or l.v !~ '^[a-z]{2}$')
    and (select pg_catalog.count(*) = pg_catalog.count(distinct l.v)
         from pg_catalog.unnest(p_lang) as l(v))
$$;

create function private.valid_recruiting_positions(p_pos public.position_code[])
  returns boolean language sql immutable set search_path = ''
as $$
  select p_pos is not null
    and pg_catalog.cardinality(p_pos) between 0 and 15
    and (select pg_catalog.count(*) = pg_catalog.count(distinct x.v)
         from pg_catalog.unnest(p_pos) as x(v))
$$;

revoke execute on function private.normalize_search(text), private.club_slug(text),
  private.valid_club_languages(text[]), private.valid_recruiting_positions(public.position_code[])
  from public, anon, authenticated, service_role;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint clubs_name_length check (char_length(name) between 3 and 32),
  slug extensions.citext not null unique,
  search_name text not null,
  description text constraint clubs_description_length check (description is null or char_length(description) <= 500),
  crest_path text constraint clubs_crest_deferred check (crest_path is null),
  platform public.platform not null,
  languages text[] not null constraint clubs_languages_valid check (private.valid_club_languages(languages)),
  level public.club_level not null,
  recruiting_open boolean not null default false,
  recruiting_positions public.position_code[] not null default '{}'
    constraint clubs_positions_valid check (private.valid_recruiting_positions(recruiting_positions)),
  status text not null default 'active'
    constraint clubs_status_valid check (status in ('active', 'dissolved')),
  dissolved_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_dissolution_coherent check (
    (status = 'active' and dissolved_at is null)
    or (status = 'dissolved' and dissolved_at is not null))
);

create index clubs_discovery_idx on public.clubs (status, platform, recruiting_open);
create index clubs_search_idx on public.clubs (search_name, id);
create index clubs_creator_created_idx on public.clubs (created_by, created_at desc);

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  slot public.membership_slot not null,
  role public.club_role not null default 'member',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason public.membership_end_reason,
  constraint membership_state_coherent check (
    (is_active and ended_at is null and end_reason is null)
    or (not is_active and ended_at is not null and end_reason is not null))
);

-- Exclusions DEFERRABLE : les futurs échanges de slots et transferts sont atomiques.
alter table public.club_memberships add constraint active_membership_slot_excl
  exclude using gist (profile_id with =, slot with =) where (is_active)
  deferrable initially deferred;
alter table public.club_memberships add constraint active_club_owner_excl
  exclude using gist (club_id with =) where (is_active and role = 'owner')
  deferrable initially deferred;

create unique index club_memberships_active_pair_unique on public.club_memberships (club_id, profile_id)
  where is_active;
create index club_memberships_profile_active_idx on public.club_memberships (profile_id, is_active);
create index club_memberships_club_active_idx on public.club_memberships (club_id, is_active);

create table private.membership_events (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.club_memberships(id) on delete restrict,
  club_id uuid not null references public.clubs(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null,
  actor_id uuid references public.profiles(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table private.membership_events enable row level security;
revoke all on private.membership_events from public, anon, authenticated;

create function private.is_club_member(p_club uuid, p_uid uuid)
  returns boolean language sql stable security definer set search_path = ''
as $$
  select p_club is not null and p_uid is not null and exists (
    select 1 from public.club_memberships m
    where m.club_id = p_club and m.profile_id = p_uid and m.is_active)
$$;
create function private.is_club_manager(p_club uuid, p_uid uuid)
  returns boolean language sql stable security definer set search_path = ''
as $$
  select p_club is not null and p_uid is not null and exists (
    select 1 from public.club_memberships m
    where m.club_id = p_club and m.profile_id = p_uid and m.is_active
      and m.role in ('owner'::public.club_role, 'manager'::public.club_role))
$$;
create function private.active_membership_count(p_uid uuid)
  returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.club_memberships m
  where m.profile_id = p_uid and m.is_active
$$;
revoke execute on function private.is_club_member(uuid,uuid),
  private.is_club_manager(uuid,uuid), private.active_membership_count(uuid)
  from public, anon, authenticated, service_role;

-- Prédicats SECURITY DEFINER minces, non exposés à PostgREST.
-- B (blocage) vérifié avant la visibilité d'un club ; historique personnel conservé.
create function rls_policies.can_see_club(p_club_id uuid)
  returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and private.is_onboarded(auth.uid()) and exists (
    select 1 from public.clubs c
    where c.id = p_club_id
      and not private.is_blocked_between(auth.uid(), c.created_by)
      and (
        (c.status = 'active' and exists (
           select 1 from public.profiles p where p.id = c.created_by and p.deleted_at is null))
        or exists (select 1 from public.club_memberships m
                   where m.club_id = c.id and m.profile_id = auth.uid())
      )
  )
$$;

create function rls_policies.can_see_membership(p_membership_id uuid)
  returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and private.is_onboarded(auth.uid()) and exists (
    select 1 from public.club_memberships m
    join public.clubs c on c.id = m.club_id
    where m.id = p_membership_id
      and not private.is_blocked_between(auth.uid(), c.created_by)
      and not private.is_blocked_between(auth.uid(), m.profile_id)
      and (
        m.profile_id = auth.uid()
        or (
          (m.is_active or private.is_club_manager(m.club_id,auth.uid()))
          and (c.status = 'active'
               or exists (select 1 from public.club_memberships ownm
                          where ownm.club_id = c.id and ownm.profile_id = auth.uid()))
        )
      )
  )
$$;

revoke execute on function rls_policies.can_see_club(uuid),
  rls_policies.can_see_membership(uuid) from public, anon, service_role;
grant execute on function rls_policies.can_see_club(uuid),
  rls_policies.can_see_membership(uuid) to authenticated;

alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
create policy clubs_read_for_onboarded on public.clubs
  for select to authenticated using (rls_policies.can_see_club(id));
create policy memberships_read_visible on public.club_memberships
  for select to authenticated using (rls_policies.can_see_membership(id));
revoke all on public.clubs, public.club_memberships from public, anon, authenticated;
grant select on public.clubs, public.club_memberships to authenticated;

-- RPC transactionnelles : aucune écriture directe. Le rôle OWNER est imposé côté serveur.
-- Les verrous advisory par profil sérialisent même le cas zéro adhésion (C7).
create function api.create_club(
  p_request_id uuid, p_name text, p_description text, p_platform public.platform,
  p_languages text[], p_level public.club_level, p_recruiting_open boolean,
  p_recruiting_positions public.position_code[]
) returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := private.uid();
  v_response jsonb;
  v_command text;
  v_name text;
  v_slug text;
  v_club uuid;
  v_membership uuid;
  v_slot public.membership_slot;
  v_count integer;
begin
  if v_uid is null or not private.is_onboarded(v_uid) then
    raise exception using message = 'UNAUTHENTICATED', errcode = 'P0001';
  end if;
  if private.has_active_sanction(v_uid) then
    raise exception using message = 'FORBIDDEN', errcode = 'P0001';
  end if;
  if p_request_id is null then
    raise exception using message = 'VALIDATION', detail = 'Identifiant de requête requis', errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cpc:memberships:' || v_uid::text, 0));
  select k.command, k.response into v_command, v_response
  from private.idempotency_keys k where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then
    if v_command <> 'create_club' then
      raise exception using message = 'CONFLICT', detail = 'Identifiant déjà utilisé', errcode = 'P0001';
    end if;
    return v_response;
  end if;

  v_name := pg_catalog.regexp_replace(pg_catalog.btrim(p_name), '[[:space:]]+', ' ', 'g');
  v_slug := private.club_slug(v_name);
  if v_name is null or char_length(v_name) not between 3 and 32 or
     v_name !~ '^[A-Za-zÀÁÂÃÄÅĀÇĆČÈÉÊËĒĖĘÌÍÎÏĪÑŃÒÓÔÕÖØŌÙÚÛÜŪÝŸŽŹŻŠŚÆŒẞàáâãäåāçćčèéêëēėęìíîïīñńòóôõöøōùúûüūýÿžźżšśæœß0-9 ''._&!-]+$'
     or char_length(v_slug) < 3
     or p_platform is null or p_level is null or p_recruiting_open is null
     or not private.valid_club_languages(p_languages)
     or not private.valid_recruiting_positions(p_recruiting_positions)
     or (p_description is not null and char_length(pg_catalog.btrim(p_description)) > 500)
  then
    raise exception using message = 'VALIDATION', detail = 'Paramètres du club invalides', errcode = 'P0001';
  end if;

  select private.active_membership_count(v_uid) into v_count;
  if v_count >= 2 then
    raise exception using message = 'LIMIT_REACHED', detail = 'Deux affiliations actives maximum', errcode = 'P0001';
  end if;
  if exists (select 1 from public.clubs c where c.created_by = v_uid
             and c.created_at > now() - interval '24 hours') then
    raise exception using message = 'RATE_LIMITED', detail = 'Une création par 24 heures', errcode = 'P0001';
  end if;
  v_slot := case
    when exists (select 1 from public.club_memberships m
                 where m.profile_id = v_uid and m.is_active and m.slot = 'primary')
      then 'secondary'::public.membership_slot
    else 'primary'::public.membership_slot end;

  -- L'unicité du slug est vérifiée sous la contrainte, même entre deux créateurs concurrents.
  if exists (select 1 from public.clubs c where c.slug = v_slug::extensions.citext) then
    raise exception using message = 'CONFLICT', detail = 'Nom de club déjà pris', errcode = 'P0001';
  end if;
  perform private.consume_rate_limit(v_uid, 'create_club', interval '24 hours', 1);

  begin
    insert into public.clubs (name,slug,search_name,description,platform,languages,level,
                              recruiting_open,recruiting_positions,created_by)
    values (v_name,v_slug,private.normalize_search(v_name),
            nullif(pg_catalog.btrim(p_description),''),p_platform,p_languages,p_level,
            p_recruiting_open,p_recruiting_positions,v_uid)
    returning id into v_club;
  exception when unique_violation then
    raise exception using message = 'CONFLICT', detail = 'Nom de club déjà pris', errcode = 'P0001';
  end;

  insert into public.club_memberships (club_id,profile_id,slot,role)
  values (v_club,v_uid,v_slot,'owner'::public.club_role)
  returning id into v_membership;

  insert into private.membership_events (membership_id,club_id,profile_id,event_type,actor_id,payload)
  values (v_membership,v_club,v_uid,'joined',v_uid,'{"reason":"club_created"}'::jsonb);

  v_response := pg_catalog.jsonb_build_object(
    'data',pg_catalog.jsonb_build_object('club_id',v_club,'slug',v_slug,'slot',v_slot),
    'server_now',now());
  insert into private.idempotency_keys (profile_id,request_id,command,response)
  values (v_uid,p_request_id,'create_club',v_response);
  return v_response;
end
$$;

create function api.update_club(
  p_request_id uuid, p_club_id uuid, p_expected_updated_at timestamptz,
  p_description text default null, p_languages text[] default null,
  p_level public.club_level default null, p_recruiting_open boolean default null,
  p_recruiting_positions public.position_code[] default null
) returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := private.uid();
  v_response jsonb;
  v_command text;
  v_club public.clubs%rowtype;
  v_updated_at timestamptz;
begin
  if v_uid is null or not private.is_onboarded(v_uid) then
    raise exception using message = 'UNAUTHENTICATED', errcode = 'P0001';
  end if;
  if private.has_active_sanction(v_uid) then
    raise exception using message = 'FORBIDDEN', errcode = 'P0001';
  end if;
  if p_request_id is null or p_club_id is null or p_expected_updated_at is null then
    raise exception using message = 'VALIDATION', detail = 'Requête incomplète', errcode = 'P0001';
  end if;

  select k.command,k.response into v_command,v_response from private.idempotency_keys k
  where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then
    if v_command <> 'update_club' then
      raise exception using message = 'CONFLICT', detail = 'Identifiant déjà utilisé', errcode = 'P0001';
    end if;
    return v_response;
  end if;

  select * into v_club from public.clubs c where c.id = p_club_id for update;
  if not found or v_club.status <> 'active'
     or not rls_policies.can_see_club(p_club_id) then
    raise exception using message = 'NOT_FOUND', errcode = 'P0001';
  end if;
  if not private.is_club_manager(p_club_id,v_uid) then
    raise exception using message = 'FORBIDDEN', errcode = 'P0001';
  end if;
  if v_club.updated_at is distinct from p_expected_updated_at then
    raise exception using message = 'CONFLICT', detail = 'Le club a été modifié', errcode = 'P0001';
  end if;
  if p_description is null and p_languages is null and p_level is null
     and p_recruiting_open is null and p_recruiting_positions is null then
    raise exception using message = 'VALIDATION', detail = 'Aucune modification', errcode = 'P0001';
  end if;
  if (p_description is not null and char_length(pg_catalog.btrim(p_description)) > 500)
     or (p_languages is not null and not private.valid_club_languages(p_languages))
     or (p_recruiting_positions is not null and not private.valid_recruiting_positions(p_recruiting_positions)) then
    raise exception using message = 'VALIDATION', detail = 'Paramètres invalides', errcode = 'P0001';
  end if;

  perform private.consume_rate_limit(v_uid,'update_club',interval '1 hour',60);

  update public.clubs c set
    description = case when p_description is null then c.description
                       else nullif(pg_catalog.btrim(p_description),'') end,
    languages = coalesce(p_languages,c.languages),
    level = coalesce(p_level,c.level),
    recruiting_open = coalesce(p_recruiting_open,c.recruiting_open),
    recruiting_positions = coalesce(p_recruiting_positions,c.recruiting_positions),
    updated_at = greatest(clock_timestamp(),c.updated_at + interval '1 microsecond')
  where c.id = p_club_id returning c.updated_at into v_updated_at;

  v_response := pg_catalog.jsonb_build_object(
    'data',pg_catalog.jsonb_build_object('club_id',p_club_id,'updated_at',v_updated_at),
    'server_now',now());
  insert into private.idempotency_keys(profile_id,request_id,command,response)
  values (v_uid,p_request_id,'update_club',v_response);
  return v_response;
end
$$;

revoke execute on function api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[]),
  api.update_club(uuid,uuid,timestamptz,text,text[],public.club_level,boolean,public.position_code[])
  from public, anon, service_role;
grant execute on function api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[]),
  api.update_club(uuid,uuid,timestamptz,text,text[],public.club_level,boolean,public.position_code[])
  to authenticated;

comment on table public.clubs is 'P2-B : clubs créés par des utilisateurs réels ; données déclaratives, visibilité authentifiée et blocages.';
comment on table public.club_memberships is 'P2-B : affiliations PRIMARY / SECONDARY ; OWNER imposé côté serveur, historique préservé.';
comment on function api.create_club(uuid,text,text,public.platform,text[],public.club_level,boolean,public.position_code[])
  is 'D-21 : création de club idempotente, 2 slots et au plus 1 création par 24 h.';
