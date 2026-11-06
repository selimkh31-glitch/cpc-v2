-- D2 rollback MANUEL. Tables et candidatures D1 préservées.
-- Bloque le retrait s'il existe des candidatures ou des événements (pas de perte de traçabilité).
begin;
do $$
begin
 if exists(select 1 from private.application_events) then
  raise exception 'D2 rollback HOLD: journal non vide';
 end if;
end $$;
drop function if exists api.confirm_membership_replacement(uuid,uuid,uuid,boolean);
drop function if exists api.decide_application(uuid,uuid,text);
drop function if exists api.withdraw_application(uuid,uuid);
drop function if exists api.apply_to_club(uuid,uuid,text);
drop table private.application_events;
commit;
