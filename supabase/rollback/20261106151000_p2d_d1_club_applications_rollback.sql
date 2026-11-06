-- Rollback MANUEL D1 uniquement, après GO explicite.
-- Ne jamais supprimer des candidatures réelles ; protection avant DDL.
begin;
do $$
begin
 if exists(select 1 from public.club_applications) then
   raise exception 'D1 rollback HOLD: candidatures présentes, suppression interdite';
 end if;
end $$;
drop policy if exists club_applications_read_allowed on public.club_applications;
drop function if exists rls_policies.can_see_club_application(uuid);
drop table public.club_applications;
drop type public.application_status;
commit;
