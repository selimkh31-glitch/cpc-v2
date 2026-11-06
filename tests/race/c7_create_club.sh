#!/usr/bin/env bash
# C7 — deux créations concurrentes avec un seul slot libre.
# Supabase local CI UNIQUEMENT. Aucune connexion à une base distante n'est acceptée.
set -euo pipefail

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
supplied="$(printenv E2E_DB_URL 2>/dev/null || true)"
if [[ -n "$supplied" && "$supplied" != "$DB_URL" ]]; then
  echo "C7 REFUS : URL de base non locale." >&2
  exit 1
fi
command -v psql >/dev/null || { echo "psql manquant"; exit 1; }
tmp="$(mktemp -d)"

cleanup() {
  psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 >/dev/null <<'SQL' || true
delete from private.membership_events where profile_id in
 ('00000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72');
delete from private.idempotency_keys where profile_id in
 ('00000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72');
delete from private.rate_limits where profile_id in
 ('00000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72');
delete from public.club_memberships where profile_id in
 ('00000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72');
delete from public.clubs where created_by in
 ('00000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72');
delete from public.profiles where id in
 ('00000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72');
delete from auth.users where id in
 ('00000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72');
SQL
  rm -rf "$tmp"
}
trap cleanup EXIT

psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id,email,aud,role) values
 ('00000000-0000-4000-8000-000000000c71','qa_c7_owner@example.test','authenticated','authenticated'),
 ('00000000-0000-4000-8000-000000000c72','qa_c7_player@example.test','authenticated','authenticated');
insert into public.profiles(id,handle,platform,main_position,languages) values
 ('00000000-0000-4000-8000-000000000c71','qa_c7_owner','ps5','GK','{fr}'),
 ('00000000-0000-4000-8000-000000000c72','qa_c7_player','ps5','ST','{fr}');
insert into public.clubs(id,name,slug,search_name,platform,languages,level,created_by)
values('10000000-0000-4000-8000-000000000c71','Equipe C7','equipe-c7','equipe c7',
       'ps5','{fr}','casual','00000000-0000-4000-8000-000000000c71');
insert into public.club_memberships(club_id,profile_id,slot,role) values
('10000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c71','primary','owner'),
('10000000-0000-4000-8000-000000000c71','00000000-0000-4000-8000-000000000c72','primary','member');
SQL

run_create() {
  local req="$1" name="$2" out="$3"
  psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
    begin;
    set local role authenticated;
    set local request.jwt.claims = '{\"sub\":\"00000000-0000-4000-8000-000000000c72\",\"role\":\"authenticated\"}';
    select api.create_club('$req','$name',null,'ps5','{fr}','casual',true,'{CB}');
    commit;
  " >"$out" 2>&1
}

run_create "70000000-0000-4000-8000-000000000c71" "C7 Alpha" "$tmp/one.log" &
p1=$!
run_create "70000000-0000-4000-8000-000000000c72" "C7 Bravo" "$tmp/two.log" &
p2=$!
set +e
wait "$p1"; s1=$?
wait "$p2"; s2=$?
set -e

if ! { grep -q '"club_id"' "$tmp/one.log" && grep -q 'LIMIT_REACHED' "$tmp/two.log"; } &&
   ! { grep -q '"club_id"' "$tmp/two.log" && grep -q 'LIMIT_REACHED' "$tmp/one.log"; }; then
  echo "C7 FAIL : attendu un succès et un refus LIMIT_REACHED (codes $s1/$s2)." >&2
  sed -n '1,15p' "$tmp/one.log" >&2
  sed -n '1,15p' "$tmp/two.log" >&2
  exit 1
fi

count="$(psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "
 select (select count(*) from public.club_memberships where profile_id='00000000-0000-4000-8000-000000000c72' and is_active)::text
        || ':' || (select count(*) from public.clubs where created_by='00000000-0000-4000-8000-000000000c72')::text;")"
if [[ "$count" != "2:1" ]]; then
  echo "C7 FAIL : attendus 2 affiliations / 1 club, obtenu $count" >&2
  exit 1
fi
echo "C7 PASS : un seul nouveau club, deux affiliations au maximum, deuxième requête refusée."
