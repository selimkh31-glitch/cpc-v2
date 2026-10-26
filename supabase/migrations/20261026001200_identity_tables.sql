-- S-1.3 — Tables d'identité et de profil (docs/04_SCHEMA_SUPABASE_RLS.md §2.1).
-- Écritures sensibles réservées aux futures commandes api.* (ADR-0004) ; ici, seuls les champs
-- personnels sans invariant sont modifiables directement par leur propriétaire.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  handle extensions.citext not null unique
    constraint profiles_handle_format check (handle::text ~ '^[a-z0-9_.-]{3,20}$'),
  avatar_path text constraint profiles_avatar_path_length check (char_length(avatar_path) <= 512),
  platform public.platform not null,
  main_position public.position_code not null,
  bio text constraint profiles_bio_length check (char_length(bio) <= 280),
  languages text[] not null default '{}'
    constraint profiles_languages_format check (
      cardinality(languages) <= 3
      and array_to_string(languages, ',') ~ '^([a-z]{2}(,[a-z]{2})*)?$'
    ),
  ea_gamertag text constraint profiles_ea_gamertag_length check (char_length(ea_gamertag) between 1 and 32),
  onboarded_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Profil CPC (D-20 : pseudo unique + gamertag EA déclaratif, jamais présenté comme vérifié).';
comment on column public.profiles.ea_gamertag is 'Déclaratif, non vérifié (D-20, D-04).';

create table public.profile_positions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position public.position_code not null,
  primary key (profile_id, position)
);
comment on table public.profile_positions is 'Postes secondaires (D-14 : ≤ 3, distincts du poste principal — contrôlés par la commande d''onboarding).';

create table public.account_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  locale text not null default 'fr' constraint account_settings_locale check (locale in ('fr')),
  age_confirmed_at timestamptz not null,
  age_threshold smallint not null constraint account_settings_age_threshold check (age_threshold >= 18),
  terms_version text,
  privacy_version text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.account_settings is 'Données privées du compte, lisibles par leur seul propriétaire. age_threshold : seuil déclaré au moment de l''onboarding (D-12, 18 TEMPORAIRE).';

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger account_settings_set_updated_at before update on public.account_settings
  for each row execute function private.set_updated_at();

-- RLS (explicite, même si ensure_rls l'active déjà dans public).
alter table public.profiles enable row level security;
alter table public.profile_positions enable row level security;
alter table public.account_settings enable row level security;

-- profiles : lecture par tout authentifié (profils non supprimés) et toujours par soi ;
-- modification de ses seuls champs personnels.
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (deleted_at is null or id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()));

-- profile_positions : visibles quand le profil l'est (la RLS de profiles s'applique dans la sous-requête).
create policy profile_positions_select_visible on public.profile_positions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id));

-- account_settings : propriétaire uniquement.
create policy account_settings_select_own on public.account_settings
  for select to authenticated
  using (profile_id = (select auth.uid()));
create policy account_settings_update_own on public.account_settings
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Privilèges minimaux (aucun INSERT/DELETE client : création par la commande d'onboarding, S-1.6).
revoke all on public.profiles, public.profile_positions, public.account_settings from anon, authenticated;
grant select on public.profiles, public.profile_positions, public.account_settings to authenticated;
grant update (avatar_path, bio, languages, ea_gamertag) on public.profiles to authenticated;
grant update (locale, marketing_opt_in) on public.account_settings to authenticated;
