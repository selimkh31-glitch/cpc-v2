-- S-1.3 — Tables techniques privées (jamais exposées) : staff, idempotence, limites de débit.

create table private.staff_members (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null constraint staff_members_role check (role in ('moderator', 'admin')),
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
comment on table private.staff_members is 'Rôle staff CPC (ADR-0002 : jamais lu depuis user_metadata).';

create table private.idempotency_keys (
  profile_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  command text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, request_id)
);
create index idempotency_keys_created_at_idx on private.idempotency_keys (created_at);

create table private.rate_limits (
  profile_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0 constraint rate_limits_count check (count >= 0),
  primary key (profile_id, bucket, window_start)
);

-- Défense en profondeur : RLS active, aucune policy, aucun privilège client.
alter table private.staff_members enable row level security;
alter table private.idempotency_keys enable row level security;
alter table private.rate_limits enable row level security;
revoke all on private.staff_members, private.idempotency_keys, private.rate_limits from public, anon, authenticated;
