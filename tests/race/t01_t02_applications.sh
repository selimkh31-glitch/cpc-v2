#!/usr/bin/env bash
# T-01/T-02 : 2 décisions et 2 confirmations réellement concurrentes (Supabase local SEULEMENT).
set -euo pipefail
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
provided="$(printenv E2E_DB_URL 2>/dev/null || true)"
if [[ -n "$provided" && "$provided" != "$DB_URL" ]]; then
  echo "T-01/T-02 REFUS : base non locale" >&2; exit 1
fi
command -v psql >/dev/null || { echo "psql manquant" >&2; exit 1; }
tmp="$(mktemp -d)"
cleanup() {
  psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 >/dev/null <<'SQL' || true
delete from private.application_events where application_id in
 (select id from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f35');
delete from private.membership_events where profile_id='00000000-0000-4000-8000-000000000f35';
delete from private.idempotency_keys where profile_id in
 ('00000000-0000-4000-8000-000000000f31','00000000-0000-4000-8000-000000000f32',
 '00000000-0000-4000-8000-000000000f33','00000000-0000-4000-8000-000000000f34',
 '00000000-0000-4000-8000-000000000f35');
delete from private.rate_limits where profile_id in
 ('00000000-0000-4000-8000-000000000f31','00000000-0000-4000-8000-000000000f32',
 '00000000-0000-4000-8000-000000000f33','00000000-0000-4000-8000-000000000f34',
 '00000000-0000-4000-8000-000000000f35');
delete from public.club_applications where profile_id='00000000-0000-4000-8000-000000000f35';
delete from public.club_memberships where profile_id in
 ('00000000-0000-4000-8000-000000000f31','00000000-0000-4000-8000-000000000f32',
 '00000000-0000-4000-8000-000000000f33','00000000-0000-4000-8000-000000000f34',
 '00000000-0000-4000-8000-000000000f35');
delete from public.clubs where id in
 ('10000000-0000-4000-8000-000000000f31','10000000-0000-4000-8000-000000000f32',
 '10000000-0000-4000-8000-000000000f33','10000000-0000-4000-8000-000000000f34');
delete from public.profiles where id in
 ('00000000-0000-4000-8000-000000000f31','00000000-0000-4000-8000-000000000f32',
 '00000000-0000-4000-8000-000000000f33','00000000-0000-4000-8000-000000000f34',
 '00000000-0000-4000-8000-000000000f35');
delete from auth.users where id in
 ('00000000-0000-4000-8000-000000000f31','00000000-0000-4000-8000-000000000f32',
 '00000000-0000-4000-8000-000000000f33','00000000-0000-4000-8000-000000000f34',
 '00000000-0000-4000-8000-000000000f35');
SQL
  rm -rf "$tmp"
}
trap cleanup EXIT

psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-4000-8000-000000000f31','race_owner_a@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000f32','race_owner_b@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000f33','race_owner_c@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000f34','race_owner_d@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000f35','race_candidate@example.test','authenticated','authenticated');
insert into public.profiles(id,handle,platform,main_position,languages) values
 ('00000000-0000-4000-8000-000000000f31','race_owner_a','ps5','GK','{fr}'),
 ('00000000-0000-4000-8000-000000000f32','race_owner_b','ps5','CB','{fr}'),
 ('00000000-0000-4000-8000-000000000f33','race_owner_c','ps5','ST','{fr}'),
 ('00000000-0000-4000-8000-000000000f34','race_owner_d','ps5','CM','{fr}'),
 ('00000000-0000-4000-8000-000000000f35','race_candidate','ps5','ST','{fr}');
insert into public.clubs(id,name,slug,search_name,platform,languages,level,recruiting_open,created_by) values
 ('10000000-0000-4000-8000-000000000f31','Race Alpha','race-alpha','race alpha','ps5','{fr}','casual',true,'00000000-0000-4000-8000-000000000f31'),
 ('10000000-0000-4000-8000-000000000f32','Race Bravo','race-bravo','race bravo','ps5','{fr}','casual',true,'00000000-0000-4000-8000-000000000f32'),
 ('10000000-0000-4000-8000-000000000f33','Race Charlie','race-charlie','race charlie','ps5','{fr}','casual',false,'00000000-0000-4000-8000-000000000f33'),
 ('10000000-0000-4000-8000-000000000f34','Race Delta','race-delta','race delta','ps5','{fr}','casual',true,'00000000-0000-4000-8000-000000000f34');
insert into public.club_memberships(club_id,profile_id,slot,role) values
 ('10000000-0000-4000-8000-000000000f31','00000000-0000-4000-8000-000000000f31','primary','owner'),
 ('10000000-0000-4000-8000-000000000f32','00000000-0000-4000-8000-000000000f32','primary','owner'),
 ('10000000-0000-4000-8000-000000000f33','00000000-0000-4000-8000-000000000f33','primary','owner'),
 ('10000000-0000-4000-8000-000000000f34','00000000-0000-4000-8000-000000000f34','primary','owner'),
 ('10000000-0000-4000-8000-000000000f33','00000000-0000-4000-8000-000000000f35','primary','member');
insert into public.club_applications(id,club_id,profile_id,message,status) values
 ('20000000-0000-4000-8000-000000000f31','10000000-0000-4000-8000-000000000f31','00000000-0000-4000-8000-000000000f35','T-01 A','pending'),
 ('20000000-0000-4000-8000-000000000f32','10000000-0000-4000-8000-000000000f32','00000000-0000-4000-8000-000000000f35','T-01 B','pending'),
 ('20000000-0000-4000-8000-000000000f34','10000000-0000-4000-8000-000000000f34','00000000-0000-4000-8000-000000000f35','T-02 D','pending');
SQL

decide() {
  local owner="$1" req="$2" app="$3" out="$4"
  psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
  begin;
  set local role authenticated;
  set local request.jwt.claims = '{\"sub\":\"$owner\",\"role\":\"authenticated\"}';
  select api.decide_application('$req','$app','accept');
  commit;" >"$out" 2>&1
}
decide '00000000-0000-4000-8000-000000000f31' '90000000-0000-4000-8000-000000000f31' '20000000-0000-4000-8000-000000000f31' "$tmp/a.log" &
pid1=$!
decide '00000000-0000-4000-8000-000000000f32' '90000000-0000-4000-8000-000000000f32' '20000000-0000-4000-8000-000000000f32' "$tmp/b.log" &
pid2=$!
wait "$pid1" || { cat "$tmp/a.log" >&2; exit 1; }
wait "$pid2" || { cat "$tmp/b.log" >&2; exit 1; }

has() { grep -Eq "\"status\"[[:space:]]*:[[:space:]]*\"$1\"" "$2"; }
if ! { has accepted "$tmp/a.log" && has awaiting_player_confirmation "$tmp/b.log"; } &&
   ! { has accepted "$tmp/b.log" && has awaiting_player_confirmation "$tmp/a.log"; }; then
  echo "T-01 FAIL : attendu accepté + attente, pas deux acceptations." >&2
  cat "$tmp/a.log" "$tmp/b.log" >&2; exit 1
fi
state="$(psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
 select (select count(*) from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f35' and is_active)::text
 || ':' || (select count(*) from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f35' and is_active and slot='secondary')::text;")"
[[ "$state" == "2:1" ]] || { echo "T-01 FAIL : affiliations $state" >&2; exit 1; }
echo "T-01 PASS : deux décisions concurrentes sérialisées, deux affiliations au maximum."

decide '00000000-0000-4000-8000-000000000f34' '90000000-0000-4000-8000-000000000f34' \
 '20000000-0000-4000-8000-000000000f34' "$tmp/d.log"
has awaiting_player_confirmation "$tmp/d.log" || { echo "T-02 préflight FAIL : D devrait attendre" >&2; cat "$tmp/d.log" >&2; exit 1; }

pending_app="$(psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
 select id from public.club_applications
 where profile_id='00000000-0000-4000-8000-000000000f35'
 and status='awaiting_player_confirmation' and club_id<>'10000000-0000-4000-8000-000000000f34';")"
secondary="$(psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
 select id from public.club_memberships
 where profile_id='00000000-0000-4000-8000-000000000f35'
 and is_active and slot='secondary';")"
[[ -n "$pending_app" && -n "$secondary" ]] || { echo "T-02 FAIL : fixtures incomplètes" >&2; exit 1; }

confirm() {
  local req="$1" app="$2" out="$3"
  psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
  begin;
  set local role authenticated;
  set local request.jwt.claims = '{\"sub\":\"00000000-0000-4000-8000-000000000f35\",\"role\":\"authenticated\"}';
  select api.confirm_membership_replacement('$req','$app','$secondary',false);
  commit;" >"$out" 2>&1
}
confirm '90000000-0000-4000-8000-000000000f35' "$pending_app" "$tmp/confirm-one.log" &
pid3=$!
confirm '90000000-0000-4000-8000-000000000f36' '20000000-0000-4000-8000-000000000f34' "$tmp/confirm-two.log" &
pid4=$!
set +e
wait "$pid3"; s3=$?
wait "$pid4"; s4=$?
set -e
if ! { [[ "$s3" == "0" && "$s4" != "0" ]] && has accepted "$tmp/confirm-one.log" && grep -q 'VALIDATION' "$tmp/confirm-two.log"; } &&
   ! { [[ "$s4" == "0" && "$s3" != "0" ]] && has accepted "$tmp/confirm-two.log" && grep -q 'VALIDATION' "$tmp/confirm-one.log"; }; then
  echo "T-02 FAIL : une seule confirmation doit réussir, l'autre doit refuser l'ancien SECONDARY." >&2
  cat "$tmp/confirm-one.log" "$tmp/confirm-two.log" >&2; exit 1
fi
state="$(psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
 select (select count(*) from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f35' and is_active)::text
 || ':' || (select count(*) from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f35' and is_active and slot='primary')::text
 || ':' || (select count(*) from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000f35' and is_active and slot='secondary')::text;")"
[[ "$state" == "2:1:1" ]] || { echo "T-02 FAIL : affiliations $state" >&2; exit 1; }
echo "T-02 PASS : deux confirmations concurrentes, un remplacement, PRIMARY conservé."
