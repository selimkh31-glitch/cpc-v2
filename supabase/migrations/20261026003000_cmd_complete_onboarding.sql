-- S-1.6 — Première commande : api.complete_onboarding (ADR-0004, Definition of Done R1–R4).
-- Crée le profil, les postes secondaires et les paramètres privés de l'appelant en une transaction.
-- Aucun paramètre d'identité : l'utilisateur est toujours auth.uid() (pas d'IDOR possible).
-- Erreurs stables (message) : UNAUTHENTICATED, VALIDATION, ALREADY_HANDLED, CONFLICT.

create function api.complete_onboarding(
  p_request_id uuid,
  p_handle text,
  p_platform public.platform,
  p_main_position public.position_code,
  p_secondary_positions public.position_code[] default '{}',
  p_age_confirmed boolean default false
)
  returns jsonb
  language plpgsql
  volatile
  security definer
  set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text;
  v_secondary public.position_code[] := coalesce(p_secondary_positions, '{}');
  v_response jsonb;
begin
  -- Identité
  if v_uid is null then
    raise exception using message = 'UNAUTHENTICATED', errcode = 'P0001';
  end if;
  if p_request_id is null then
    raise exception using message = 'VALIDATION', detail = 'request_id requis', errcode = 'P0001';
  end if;

  -- Idempotence (rejeu du même request_id → même réponse, sans nouvelle écriture)
  select k.response into v_response
    from private.idempotency_keys k
   where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then
    return v_response;
  end if;

  -- Sérialise les soumissions concurrentes du même utilisateur, puis revérifie.
  perform pg_advisory_xact_lock(hashtextextended('cpc:onboarding:' || v_uid::text, 0));
  select k.response into v_response
    from private.idempotency_keys k
   where k.profile_id = v_uid and k.request_id = p_request_id;
  if found then
    return v_response;
  end if;

  if exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception using message = 'ALREADY_HANDLED', detail = 'profil déjà créé', errcode = 'P0001';
  end if;

  -- Validation (D-12 âge déclaré, D-14 postes, D-15 plateformes, D-20 pseudo)
  if p_age_confirmed is distinct from true then
    raise exception using message = 'VALIDATION', detail = 'déclaration d''âge requise', errcode = 'P0001';
  end if;
  v_handle := lower(btrim(coalesce(p_handle, '')));
  if v_handle !~ '^[a-z0-9_.-]{3,20}$' then
    raise exception using message = 'VALIDATION', detail = 'pseudo invalide', errcode = 'P0001';
  end if;
  if p_platform is null or p_main_position is null then
    raise exception using message = 'VALIDATION', detail = 'plateforme et poste principal requis', errcode = 'P0001';
  end if;
  if cardinality(v_secondary) > 3 then
    raise exception using message = 'VALIDATION', detail = '3 postes secondaires maximum', errcode = 'P0001';
  end if;
  if p_main_position = any (v_secondary) or array_position(v_secondary, null) is not null then
    raise exception using message = 'VALIDATION', detail = 'postes secondaires invalides', errcode = 'P0001';
  end if;
  if (select count(distinct s) from unnest(v_secondary) s) <> cardinality(v_secondary) then
    raise exception using message = 'VALIDATION', detail = 'postes secondaires en double', errcode = 'P0001';
  end if;

  -- Écritures
  begin
    insert into public.profiles (id, handle, platform, main_position)
    values (v_uid, v_handle::extensions.citext, p_platform, p_main_position);
  exception when unique_violation then
    raise exception using message = 'CONFLICT', detail = 'pseudo déjà pris', errcode = 'P0001';
  end;
  insert into public.profile_positions (profile_id, position)
  select v_uid, s from unnest(v_secondary) s;
  -- D-12 : seuil TEMPORAIRE 18 ans, consigné avec la déclaration.
  insert into public.account_settings (profile_id, age_confirmed_at, age_threshold)
  values (v_uid, now(), 18);

  v_response := jsonb_build_object('profile_id', v_uid, 'handle', v_handle);
  insert into private.idempotency_keys (profile_id, request_id, command, response)
  values (v_uid, p_request_id, 'complete_onboarding', v_response);
  return v_response;
end
$$;

revoke execute on function api.complete_onboarding(uuid, text, public.platform, public.position_code, public.position_code[], boolean)
  from public, anon, service_role;
grant execute on function api.complete_onboarding(uuid, text, public.platform, public.position_code, public.position_code[], boolean)
  to authenticated;
comment on function api.complete_onboarding(uuid, text, public.platform, public.position_code, public.position_code[], boolean) is
  'S-1.6 / ADR-0004 : onboarding de l''appelant (auth.uid()). Idempotent par request_id. Erreurs : UNAUTHENTICATED, VALIDATION, ALREADY_HANDLED, CONFLICT.';
