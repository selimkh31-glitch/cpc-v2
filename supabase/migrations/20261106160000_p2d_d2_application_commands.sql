-- CPC V2 / P2-D2 — commandes transactionnelles de candidature (D-13 et D-22 validées).
-- Exclusivement préparé en PR ; AUCUNE application staging sans CI et revue.
create table private.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.club_applications(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table private.application_events enable row level security;
revoke all on private.application_events from public,anon,authenticated,service_role;

-- Candidater : idempotence + club visible, ouvert, non bloqué, non membre.
create function api.apply_to_club(
 p_request_id uuid,p_club_id uuid,p_message text default null
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_uid uuid := private.uid();
 v_club public.clubs%rowtype;
 v_response jsonb;
 v_command text;
 v_app_id uuid;
begin
 if v_uid is null or not private.is_onboarded(v_uid) then
  raise exception using message='UNAUTHENTICATED',errcode='P0001';
 end if;
 if private.has_active_sanction(v_uid) then
  raise exception using message='FORBIDDEN',errcode='P0001';
 end if;
 if p_request_id is null or p_club_id is null or
    (p_message is not null and char_length(pg_catalog.btrim(p_message)) > 500) then
  raise exception using message='VALIDATION',errcode='P0001';
 end if;
 -- Sérialise les changements de candidature du même joueur vers un même club.
 perform pg_advisory_xact_lock(hashtextextended('cpc:application:'||p_club_id::text||':'||v_uid::text,0));
 select k.command,k.response into v_command,v_response from private.idempotency_keys k
  where k.profile_id=v_uid and k.request_id=p_request_id;
 if found then
  if v_command <> 'apply_to_club' then raise exception using message='CONFLICT',errcode='P0001'; end if;
  return v_response;
 end if;
 select * into v_club from public.clubs c where c.id=p_club_id;
 if not found or v_club.status <> 'active' or not v_club.recruiting_open
    or not rls_policies.can_see_club(p_club_id)
    or private.is_blocked_between(v_uid,v_club.created_by) then
  raise exception using message='NOT_FOUND',errcode='P0001';
 end if;
 if private.is_club_member(p_club_id,v_uid) then
  raise exception using message='CONFLICT',errcode='P0001';
 end if;
 -- Expiration applicative effective sans tâche cron : les anciens candidats ne bloquent pas une nouvelle demande.
 update public.club_applications a
  set status='expired',updated_at=clock_timestamp()
  where a.club_id=p_club_id and a.profile_id=v_uid
    and a.status in ('pending','awaiting_player_confirmation') and a.expires_at<=now();
 if exists(select 1 from public.club_applications a
   where a.club_id=p_club_id and a.profile_id=v_uid
     and a.status in ('pending','awaiting_player_confirmation')) then
  raise exception using message='CONFLICT',errcode='P0001';
 end if;
 perform private.consume_rate_limit(v_uid,'apply_to_club',interval '1 hour',12);
 insert into public.club_applications(club_id,profile_id,message,status,expires_at)
 values(p_club_id,v_uid,nullif(pg_catalog.btrim(p_message),''),'pending',now()+interval '14 days')
 returning id into v_app_id;
 insert into private.application_events(application_id,actor_id,event_type)
 values(v_app_id,v_uid,'applied');
 v_response:=pg_catalog.jsonb_build_object('data',pg_catalog.jsonb_build_object(
  'application_id',v_app_id,'club_id',p_club_id,'status','pending'),
  'server_now',now());
 insert into private.idempotency_keys(profile_id,request_id,command,response)
 values(v_uid,p_request_id,'apply_to_club',v_response);
 return v_response;
end $$;

-- Retirer sa demande : jamais une acceptation ou une adhésion existante.
create function api.withdraw_application(
 p_request_id uuid,p_application_id uuid
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_uid uuid:=private.uid();
 v_app public.club_applications%rowtype;
 v_response jsonb;
 v_command text;
 v_status public.application_status;
begin
 if v_uid is null or not private.is_onboarded(v_uid) then
  raise exception using message='UNAUTHENTICATED',errcode='P0001';
 end if;
 if p_request_id is null or p_application_id is null then
  raise exception using message='VALIDATION',errcode='P0001';
 end if;
 select k.command,k.response into v_command,v_response from private.idempotency_keys k
 where k.profile_id=v_uid and k.request_id=p_request_id;
 if found then
  if v_command <> 'withdraw_application' then
    raise exception using message='CONFLICT',errcode='P0001'; end if;
  return v_response;
 end if;
 select * into v_app from public.club_applications where id=p_application_id for update;
 if not found or v_app.profile_id<>v_uid then
  raise exception using message='NOT_FOUND',errcode='P0001';
 end if;
 if v_app.status not in ('pending','awaiting_player_confirmation') then
  raise exception using message='ALREADY_HANDLED',errcode='P0001';
 end if;
 v_status:=case when v_app.expires_at<=now() then 'expired'::public.application_status
               else 'withdrawn'::public.application_status end;
 update public.club_applications set status=v_status,updated_at=clock_timestamp()
  where id=p_application_id;
 insert into private.application_events(application_id,actor_id,event_type)
 values(p_application_id,v_uid,case when v_status='expired' then 'expired' else 'withdrawn' end);
 v_response:=pg_catalog.jsonb_build_object('data',pg_catalog.jsonb_build_object(
  'application_id',p_application_id,'club_id',v_app.club_id,'status',v_status),
  'server_now',now());
 insert into private.idempotency_keys(profile_id,request_id,command,response)
 values(v_uid,p_request_id,'withdraw_application',v_response);
 return v_response;
end $$;

-- Le manager décide ; en présence de 2 affiliations, PAS de remplacement automatique.
create function api.decide_application(
 p_request_id uuid,p_application_id uuid,p_decision text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_uid uuid:=private.uid();
 v_app public.club_applications%rowtype;
 v_club public.clubs%rowtype;
 v_profile_id uuid;
 v_response jsonb;
 v_command text;
 v_count integer;
 v_slot public.membership_slot;
 v_status public.application_status;
 v_membership_id uuid;
begin
 if v_uid is null or not private.is_onboarded(v_uid) then
  raise exception using message='UNAUTHENTICATED',errcode='P0001';
 end if;
 if private.has_active_sanction(v_uid) then
  raise exception using message='FORBIDDEN',errcode='P0001';
 end if;
 if p_request_id is null or p_application_id is null or p_decision not in ('accept','reject')
    or p_decision is null then
  raise exception using message='VALIDATION',errcode='P0001';
 end if;
 -- Prélecture sans droits : ne révèle rien tant que l'autorisation contextuelle n'est pas acquise.
 select a.profile_id into v_profile_id from public.club_applications a where a.id=p_application_id;
 if v_profile_id is null then raise exception using message='NOT_FOUND',errcode='P0001'; end if;
 -- Même verrou que create_club : pas de troisième affiliation en cas de décisions parallèles.
 perform pg_advisory_xact_lock(hashtextextended('cpc:memberships:'||v_profile_id::text,0));
 select k.command,k.response into v_command,v_response from private.idempotency_keys k
 where k.profile_id=v_uid and k.request_id=p_request_id;
 if found then
  if v_command <> 'decide_application' then
    raise exception using message='CONFLICT',errcode='P0001'; end if;
  return v_response;
 end if;
 select * into v_app from public.club_applications where id=p_application_id for update;
 if not found then raise exception using message='NOT_FOUND',errcode='P0001'; end if;
 select * into v_club from public.clubs c where c.id=v_app.club_id;
 if not found or v_club.status<>'active' or not private.is_club_manager(v_app.club_id,v_uid)
    or not rls_policies.can_see_club(v_app.club_id)
    or private.is_blocked_between(v_uid,v_app.profile_id)
    or private.is_blocked_between(v_club.created_by,v_app.profile_id) then
  raise exception using message='NOT_FOUND',errcode='P0001';
 end if;
 if v_app.status<>'pending' then
  raise exception using message='ALREADY_HANDLED',errcode='P0001';
 end if;
 if v_app.expires_at<=now() then
  -- Ne décide JAMAIS une demande échue (mise à jour par le balayage applicatif ultérieur).
  raise exception using message='EXPIRED',errcode='P0001';
 end if;
 if not private.is_onboarded(v_app.profile_id) then
  raise exception using message='NOT_FOUND',errcode='P0001';
 end if;
 if private.is_club_member(v_app.club_id,v_app.profile_id) then
  raise exception using message='CONFLICT',errcode='P0001';
 end if;
 perform private.consume_rate_limit(v_uid,'decide_application',interval '1 hour',100);
 if p_decision='reject' then
  v_status:='rejected';
 else
  v_count:=private.active_membership_count(v_app.profile_id);
  if v_count>=2 then
   v_status:='awaiting_player_confirmation';
  else
   v_slot:=case when exists(select 1 from public.club_memberships m
         where m.profile_id=v_app.profile_id and m.is_active and m.slot='primary')
      then 'secondary'::public.membership_slot else 'primary'::public.membership_slot end;
   insert into public.club_memberships(club_id,profile_id,slot,role)
   values(v_app.club_id,v_app.profile_id,v_slot,'member')
   returning id into v_membership_id;
   insert into private.membership_events(membership_id,club_id,profile_id,actor_id,event_type,payload)
   values(v_membership_id,v_app.club_id,v_app.profile_id,v_uid,'joined',
     pg_catalog.jsonb_build_object('application_id',v_app.id));
   v_status:='accepted';
  end if;
 end if;
 update public.club_applications
   set status=v_status,decided_by=v_uid,decided_at=now(),updated_at=clock_timestamp()
 where id=v_app.id;
 insert into private.application_events(application_id,actor_id,event_type,payload)
 values(v_app.id,v_uid,case when p_decision='reject' then 'rejected' else 'approved' end,
  pg_catalog.jsonb_build_object('status',v_status));
 v_response:=pg_catalog.jsonb_build_object('data',pg_catalog.jsonb_build_object(
  'application_id',v_app.id,'club_id',v_app.club_id,'status',v_status,'membership_id',v_membership_id),
  'server_now',now());
 insert into private.idempotency_keys(profile_id,request_id,command,response)
 values(v_uid,p_request_id,'decide_application',v_response);
 return v_response;
end $$;

-- L'utilisateur choisit SON SECONDARY ; une affiliation OWNER ne peut jamais être orpheline.
-- Si SECONDARY manager, p_acknowledge_manager_role_loss=true démontre le consentement explicite.
create function api.confirm_membership_replacement(
 p_request_id uuid,p_application_id uuid,p_replace_membership_id uuid,
 p_acknowledge_manager_role_loss boolean default false
) returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_uid uuid:=private.uid();
 v_app public.club_applications%rowtype;
 v_old public.club_memberships%rowtype;
 v_club public.clubs%rowtype;
 v_response jsonb;
 v_command text;
 v_membership_id uuid;
begin
 if v_uid is null or not private.is_onboarded(v_uid) then
  raise exception using message='UNAUTHENTICATED',errcode='P0001';
 end if;
 if private.has_active_sanction(v_uid) then
  raise exception using message='FORBIDDEN',errcode='P0001';
 end if;
 if p_request_id is null or p_application_id is null or p_replace_membership_id is null then
  raise exception using message='VALIDATION',errcode='P0001';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('cpc:memberships:'||v_uid::text,0));
 select k.command,k.response into v_command,v_response from private.idempotency_keys k
 where k.profile_id=v_uid and k.request_id=p_request_id;
 if found then
  if v_command <> 'confirm_membership_replacement' then
    raise exception using message='CONFLICT',errcode='P0001'; end if;
  return v_response;
 end if;
 select * into v_app from public.club_applications where id=p_application_id for update;
 if not found or v_app.profile_id<>v_uid then
  raise exception using message='NOT_FOUND',errcode='P0001';
 end if;
 if v_app.status<>'awaiting_player_confirmation' then
  raise exception using message='ALREADY_HANDLED',errcode='P0001';
 end if;
 if v_app.expires_at<=now() then
  raise exception using message='EXPIRED',errcode='P0001';
 end if;
 select * into v_club from public.clubs where id=v_app.club_id;
 if not found or v_club.status<>'active' or not rls_policies.can_see_club(v_app.club_id)
    or private.is_blocked_between(v_uid,v_club.created_by) then
   raise exception using message='NOT_FOUND',errcode='P0001';
 end if;
 select * into v_old from public.club_memberships
  where id=p_replace_membership_id and profile_id=v_uid and is_active for update;
 if not found or v_old.slot<>'secondary' or v_old.club_id=v_app.club_id then
  raise exception using message='VALIDATION',errcode='P0001';
 end if;
 -- Owner : aucun club orphelin, même si son propriétaire est seul (D-06 non encore implémentée).
 if v_old.role='owner' then
  raise exception using message='OWNER_MUST_TRANSFER',errcode='P0001';
 end if;
 if v_old.role='manager' and not coalesce(p_acknowledge_manager_role_loss,false) then
  raise exception using message='CONSENT_REQUIRED',errcode='P0001';
 end if;
 if not private.is_club_manager(v_app.club_id,v_app.decided_by)
    or private.is_blocked_between(v_uid,v_app.decided_by) then
  raise exception using message='NOT_FOUND',errcode='P0001';
 end if;
 if private.is_club_member(v_app.club_id,v_uid) then
  raise exception using message='CONFLICT',errcode='P0001';
 end if;
 if private.active_membership_count(v_uid)<>2 then
  raise exception using message='CONFLICT',errcode='P0001';
 end if;
 -- Exclusion de slot DEFERRABLE déjà posée en B2 ; changement atomique.
 update public.club_memberships set is_active=false,ended_at=now(),
   end_reason='replaced' where id=v_old.id;
 insert into public.club_memberships(club_id,profile_id,slot,role)
 values(v_app.club_id,v_uid,'secondary','member') returning id into v_membership_id;
 insert into private.membership_events(membership_id,club_id,profile_id,actor_id,event_type,payload)
 values(v_old.id,v_old.club_id,v_uid,v_uid,'replaced',
    pg_catalog.jsonb_build_object('new_club_id',v_app.club_id,'manager_role_lost',v_old.role='manager')),
 (v_membership_id,v_app.club_id,v_uid,v_uid,'joined',
    pg_catalog.jsonb_build_object('application_id',v_app.id,'replaced_membership_id',v_old.id));
 update public.club_applications set status='accepted',updated_at=clock_timestamp()
 where id=v_app.id;
 insert into private.application_events(application_id,actor_id,event_type,payload)
 values(v_app.id,v_uid,'replacement_confirmed',
  pg_catalog.jsonb_build_object('replaced_membership_id',v_old.id,
    'manager_role_lost',v_old.role='manager'));
 v_response:=pg_catalog.jsonb_build_object('data',pg_catalog.jsonb_build_object(
  'application_id',v_app.id,'club_id',v_app.club_id,'status','accepted','membership_id',v_membership_id),
  'server_now',now());
 insert into private.idempotency_keys(profile_id,request_id,command,response)
 values(v_uid,p_request_id,'confirm_membership_replacement',v_response);
 return v_response;
end $$;

revoke execute on function api.apply_to_club(uuid,uuid,text),
  api.withdraw_application(uuid,uuid),
  api.decide_application(uuid,uuid,text),
  api.confirm_membership_replacement(uuid,uuid,uuid,boolean)
 from public,anon,service_role;
grant execute on function api.apply_to_club(uuid,uuid,text),
  api.withdraw_application(uuid,uuid),
  api.decide_application(uuid,uuid,text),
  api.confirm_membership_replacement(uuid,uuid,uuid,boolean)
 to authenticated;
