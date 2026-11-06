-- CPC V2 / P2-D1 — données des candidatures. Décisions D-13 / D-22 (Selim, 06/11/2026).
-- Staging uniquement APRES PR CI 5/5 + GO d'application ; jamais de données fictives.
-- Toutes les mutations sont interdites au client : commandes D2 uniquement.
create type public.application_status as enum
  ('pending','awaiting_player_confirmation','accepted','rejected','withdrawn','expired');

create table public.club_applications (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  message text constraint club_applications_message_max
    check (message is null or char_length(message) <= 500),
  status public.application_status not null default 'pending',
  decided_by uuid references public.profiles(id) on delete restrict,
  decided_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_applications_decision_coherent check (
    ((status in ('pending','withdrawn') and decided_by is null and decided_at is null)
      or (status in ('awaiting_player_confirmation','accepted','rejected')
          and decided_by is not null and decided_at is not null)
      or status = 'expired')
  ),
  constraint club_applications_expiry_positive check (expires_at > created_at)
);

create unique index club_applications_active_pair_unique
  on public.club_applications (club_id,profile_id)
  where status in ('pending','awaiting_player_confirmation');
create index club_applications_club_review_idx
  on public.club_applications (club_id,status,expires_at,created_at desc);
create index club_applications_profile_idx
  on public.club_applications (profile_id,created_at desc);

alter table public.club_applications enable row level security;
revoke all on public.club_applications from public,anon,authenticated,service_role;
grant select on public.club_applications to authenticated;

-- Les managers doivent pouvoir vérifier les candidatures au club, mais ne peuvent
-- pas consulter celles d'un joueur ayant un blocage réciproque.
-- La fonction SECURITY DEFINER est dans rls_policies (non exposé par PostgREST).
create function rls_policies.can_see_club_application(p_application_id uuid)
  returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and private.is_onboarded(auth.uid())
    and exists (
      select 1
      from public.club_applications a
      join public.clubs c on c.id = a.club_id
      where a.id = p_application_id
        and (
          a.profile_id = auth.uid()
          or (
            c.status = 'active'
            and rls_policies.can_see_club(a.club_id)
            and private.is_club_manager(a.club_id, auth.uid())
            and not private.is_blocked_between(auth.uid(),a.profile_id)
          )
        )
    )
$$;
revoke execute on function rls_policies.can_see_club_application(uuid)
  from public,anon,service_role;
grant execute on function rls_policies.can_see_club_application(uuid) to authenticated;

create policy club_applications_read_allowed on public.club_applications
  for select to authenticated
  using (rls_policies.can_see_club_application(id));

comment on table public.club_applications is
  'P2-D1 : candidatures; expiration 14 jours serveur; lecture candidat et manager autorisé, mutation exclusivement par RPC.';
comment on function rls_policies.can_see_club_application(uuid) is
  'P2-D1 : prédicat RLS privé avec règles de visibilité, blocage et rôle contextuel.';

-- Les futures invitations et transferts respecteront D-22 (7 jours / 72 heures),
-- mais leurs tables ne sont PAS créées prématurément par cette migration.
