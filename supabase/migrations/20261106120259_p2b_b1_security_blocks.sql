-- P2-B · B1 — Sécurité et blocages (docs/27, contrat docs/26 §2.1, §3, §4).
-- Socle d'autorisation des lots Explorer Clubs : helpers private.*, blocage serveur (sans UI),
-- schéma rls_policies pour les prédicats de policy, profils / postes / avatars masqués en cas de
-- blocage dans un sens ou dans l'autre. Effet : resserrement uniquement, aucun accès nouveau.
-- Rollback : supabase/rollback/20261028200000_p2b_b1_rollback.sql (conserve les blocages existants).

-- ── 1. Helpers private (SECURITY DEFINER, search_path vide, jamais exécutables par les clients) ──

-- Identité active : auth.uid(), sauf si le profil existe et est supprimé (tombstone).
create function private.uid()
  returns uuid
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select case
    when auth.uid() is null then null
    when exists (select 1 from public.profiles p where p.id = auth.uid() and p.deleted_at is not null) then null
    else auth.uid()
  end
$$;
comment on function private.uid() is 'docs/04 §3 : auth.uid(), NULL si le profil est supprimé. Interne.';

create function private.is_onboarded(p_uid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select p_uid is not null
     and exists (select 1 from public.profiles p where p.id = p_uid and p.deleted_at is null)
$$;
comment on function private.is_onboarded(uuid) is 'docs/04 §3 : profil créé (onboarding terminé) et non supprimé. Interne.';

-- Stub documenté : aucune table de sanctions avant la Phase 5. La séquence ADR-0004 (« sanction
-- vérifiée ») est câblée dès maintenant ; seule cette fonction changera.
create function private.has_active_sanction(p_uid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select false
$$;
comment on function private.has_active_sanction(uuid) is
  'STUB (B1) : renvoie toujours false tant que les sanctions (Phase 5) n''existent pas. Interne.';

-- Rate limit par fenêtre fixe (private.rate_limits, inutilisée jusqu'ici). Lève RATE_LIMITED au-delà de p_max.
create function private.consume_rate_limit(p_uid uuid, p_bucket text, p_window interval, p_max integer)
  returns void
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
  v_count integer;
begin
  insert into private.rate_limits as r (profile_id, bucket, window_start, count)
  values (p_uid, p_bucket, v_window, 1)
  on conflict (profile_id, bucket, window_start) do update set count = r.count + 1
  returning r.count into v_count;
  if v_count > p_max then
    raise exception using message = 'RATE_LIMITED', detail = p_bucket, errcode = 'P0001';
  end if;
end
$$;
comment on function private.consume_rate_limit(uuid, text, interval, integer) is
  'ADR-0004 R4 : compteur atomique par (profil, bucket, fenêtre). Lève RATE_LIMITED au-delà du plafond. Interne.';

-- ── 2. Table public.user_blocks (lecture : le bloqueur seul ; écriture : commandes uniquement) ──
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_id_idx on public.user_blocks (blocked_id);
comment on table public.user_blocks is
  'SAF-01 (serveur) : blocages. Visible du seul bloqueur (le bloqué ne peut pas savoir qui l''a bloqué). Écritures par api.block_user / api.unblock_user.';

alter table public.user_blocks enable row level security;
create policy user_blocks_select_own on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));
revoke all on public.user_blocks from public, anon, authenticated;
grant select on public.user_blocks to authenticated;

-- Blocage dans un sens ou dans l'autre. Ne lit que user_blocks (aucune policy dépendante : pas de récursion).
create function private.is_blocked_between(p_a uuid, p_b uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.user_blocks b
     where (b.blocker_id = p_a and b.blocked_id = p_b)
        or (b.blocker_id = p_b and b.blocked_id = p_a)
  )
$$;
comment on function private.is_blocked_between(uuid, uuid) is 'docs/04 §3 : blocage dans un sens ou dans l''autre. Interne.';

revoke execute on function private.uid(), private.is_onboarded(uuid), private.has_active_sanction(uuid),
  private.consume_rate_limit(uuid, text, interval, integer), private.is_blocked_between(uuid, uuid)
  from public, anon, authenticated, service_role;

-- ── 3. Schéma rls_policies : prédicats appelables par les policies (rôle de l'appelant) ────────
-- Même principe que storage_policies (S-1.9) : private reste fermé ; ce schéma n'est pas exposé
-- par l'API (supabase/config.toml [api] schemas = public, graphql_public, api).
create schema rls_policies;
revoke all on schema rls_policies from public;
grant usage on schema rls_policies to authenticated;
comment on schema rls_policies is
  'P2-B : prédicats SECURITY DEFINER minces pour les policies RLS. Non exposé par PostgREST ; aucune table ; jamais anon.';

create function rls_policies.can_see_profile(p_profile_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select auth.uid() is not null and (
    p_profile_id = auth.uid()
    or not private.is_blocked_between(auth.uid(), p_profile_id)
  )
$$;
comment on function rls_policies.can_see_profile(uuid) is
  'B1 : soi, ou profil sans blocage avec l''appelant (dans les deux sens). Utilisé par la policy profiles.';
revoke execute on function rls_policies.can_see_profile(uuid) from public, anon, service_role;
grant execute on function rls_policies.can_see_profile(uuid) to authenticated;

-- ── 4. Policy profiles : + non bloqué (B). Son propre profil reste toujours visible. ─────────────
-- profile_positions suit automatiquement (sa policy passe par une sous-requête sur profiles).
drop policy profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (deleted_at is null and rls_policies.can_see_profile(id))
  );

-- ── 5. Avatars : même règle (dossier d'autrui invisible en cas de blocage) ──────────────────────
create or replace function private.avatar_is_visible(p_name text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.profiles p
       where p.id::text = split_part(p_name, '/', 1)
         and p.deleted_at is null
         and not private.is_blocked_between(auth.uid(), p.id)
    )
  )
$$;
revoke execute on function private.avatar_is_visible(text) from public, anon, authenticated, service_role;

-- ── 6. Commandes api.block_user / api.unblock_user (ADR-0004 R1–R4) ────────────────────────────
-- Séquence : identité → idempotence → verrou utilisateur → validation → rate limit → écriture → réponse.
-- Réponse identique que la cible ait déjà bloqué l'appelant ou non : aucun oracle « qui m'a bloqué ».
create function api.block_user(p_request_id uuid, p_target uuid)
  returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_uid uuid := private.uid();
  v_response jsonb;
begin
  if v_uid is null or not private.is_onboarded(v_uid) then
    raise exception using message = 'UNAUTHENTICATED', errcode = 'P0001';
  end if;
  if private.has_active_sanction(v_uid) then
    raise exception using message = 'FORBIDDEN', errcode = 'P0001';
  end if;
  if p_request_id is null then
    raise exception using message = 'VALIDATION', detail = 'request_id requis', errcode = 'P0001';
  end if;

  select k.response into v_response from private.idempotency_keys k
   where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then return v_response; end if;

  -- Sérialise les appels concurrents du même utilisateur, puis revérifie l'idempotence.
  perform pg_advisory_xact_lock(hashtextextended('cpc:blocks:' || v_uid::text, 0));
  select k.response into v_response from private.idempotency_keys k
   where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then return v_response; end if;

  if p_target is null or p_target = v_uid
     or not exists (select 1 from public.profiles p where p.id = p_target and p.deleted_at is null) then
    raise exception using message = 'VALIDATION', detail = 'cible invalide', errcode = 'P0001';
  end if;

  perform private.consume_rate_limit(v_uid, 'block_user', interval '1 hour', 30);

  insert into public.user_blocks (blocker_id, blocked_id) values (v_uid, p_target)
  on conflict (blocker_id, blocked_id) do nothing;

  v_response := jsonb_build_object('data', jsonb_build_object('blocked', true), 'server_now', now());
  insert into private.idempotency_keys (profile_id, request_id, command, response)
  values (v_uid, p_request_id, 'block_user', v_response);
  return v_response;
end
$$;

create function api.unblock_user(p_request_id uuid, p_target uuid)
  returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_uid uuid := private.uid();
  v_response jsonb;
begin
  if v_uid is null or not private.is_onboarded(v_uid) then
    raise exception using message = 'UNAUTHENTICATED', errcode = 'P0001';
  end if;
  if private.has_active_sanction(v_uid) then
    raise exception using message = 'FORBIDDEN', errcode = 'P0001';
  end if;
  if p_request_id is null then
    raise exception using message = 'VALIDATION', detail = 'request_id requis', errcode = 'P0001';
  end if;

  select k.response into v_response from private.idempotency_keys k
   where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then return v_response; end if;

  perform pg_advisory_xact_lock(hashtextextended('cpc:blocks:' || v_uid::text, 0));
  select k.response into v_response from private.idempotency_keys k
   where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then return v_response; end if;

  if p_target is null or p_target = v_uid then
    raise exception using message = 'VALIDATION', detail = 'cible invalide', errcode = 'P0001';
  end if;

  perform private.consume_rate_limit(v_uid, 'block_user', interval '1 hour', 30);

  -- Ne supprime que le blocage posé par l'appelant (jamais celui que la cible aurait posé).
  delete from public.user_blocks b where b.blocker_id = v_uid and b.blocked_id = p_target;

  v_response := jsonb_build_object('data', jsonb_build_object('blocked', false), 'server_now', now());
  insert into private.idempotency_keys (profile_id, request_id, command, response)
  values (v_uid, p_request_id, 'unblock_user', v_response);
  return v_response;
end
$$;

revoke execute on function api.block_user(uuid, uuid), api.unblock_user(uuid, uuid) from public, anon, service_role;
grant execute on function api.block_user(uuid, uuid), api.unblock_user(uuid, uuid) to authenticated;
comment on function api.block_user(uuid, uuid) is
  'B1 / ADR-0004 : l''appelant bloque p_target. Idempotent (request_id), 30 / h. Erreurs : UNAUTHENTICATED, FORBIDDEN, VALIDATION, RATE_LIMITED.';
comment on function api.unblock_user(uuid, uuid) is
  'B1 / ADR-0004 : l''appelant retire SON blocage de p_target. Idempotent, 30 / h (bucket partagé). Erreurs : UNAUTHENTICATED, FORBIDDEN, VALIDATION, RATE_LIMITED.';
