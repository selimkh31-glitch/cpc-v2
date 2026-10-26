-- D-38 : durcissement de public.rls_auto_enable() — conservée, jamais supprimée.
--
-- 1) Parité locale. Sur le staging et la production, la fonction et l'event trigger `ensure_rls`
--    sont fournis par la plateforme Supabase (définition relevée sur le staging le 25/10/2026).
--    Sur un Supabase local (CI), ils n'existent pas : on les recrée à l'identique pour que le
--    durcissement soit testé en CI. Sur le staging, ces blocs ne font rien (objets déjà présents).
do $do$
begin
  if to_regprocedure('public.rls_auto_enable()') is null then
    execute $create_fn$
      create function public.rls_auto_enable()
        returns event_trigger
        language plpgsql
        security definer
        set search_path to 'pg_catalog'
      as $function$
      declare
        cmd record;
        tbl name;
      begin
        for cmd in
          select *
          from pg_event_trigger_ddl_commands()
          where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
            and object_type in ('table','partitioned table')
        loop
           if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
            begin
              select c.relname into tbl from pg_catalog.pg_class c where c.oid = cmd.objid;
              execute format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
              raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
            exception
              when others then
                raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
            end;
           else
              raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
           end if;
        end loop;
      end;
      $function$
    $create_fn$;
  end if;

  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    execute $create_trg$
      create event trigger ensure_rls on ddl_command_end
        when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
        execute function public.rls_auto_enable()
    $create_trg$;
  end if;
end
$do$;

-- 2) Durcissement : plus aucun appel direct possible (advisors 0028/0029).
--    Le déclenchement par l'event trigger n'est pas soumis au droit EXECUTE de l'utilisateur.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;

comment on function public.rls_auto_enable() is
  'Fonction de plateforme Supabase (event trigger ensure_rls). D-38 : conservée ; EXECUTE retiré à PUBLIC, anon, authenticated, service_role. Rollback : supabase/rollback/20261026001000_d38_rls_auto_enable_hardening.rollback.sql';
