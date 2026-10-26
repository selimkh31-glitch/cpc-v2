-- Procédure de retour arrière — lot 2, staging cglbsllwdmluvbisozyx UNIQUEMENT.
-- À n'exécuter que sur décision explicite de Selim, dans l'ordre inverse d'application.
-- Applicable tant que le staging ne contient aucune donnée (état au 26/10/2026 : 0 table, 0 utilisateur réel).
-- Ne touche jamais à public.rls_auto_enable() ni à l'event trigger ensure_rls (D-38).

-- 0030 — complete_onboarding
drop function if exists api.complete_onboarding(uuid, text, public.platform, public.position_code, public.position_code[], boolean);

-- 0020 — D-40
drop function if exists api.assert_session_active();
drop function if exists private.session_is_active(uuid);

-- 0013 — tables techniques privées
drop table if exists private.rate_limits;
drop table if exists private.idempotency_keys;
drop table if exists private.staff_members;

-- 0012 — identité
drop table if exists public.account_settings;
drop table if exists public.profile_positions;
drop table if exists public.profiles;

-- 0011 — fondations
drop function if exists private.set_updated_at();
drop function if exists public.position_group_of(public.position_code);
drop type if exists public.position_group;
drop type if exists public.position_code;
drop type if exists public.platform;
-- Privilèges par défaut : rétablir ceux de la plateforme si nécessaire (constater avant via pg_default_acl).
drop schema if exists private;   -- échoue s'il reste des objets (garde-fou volontaire)
drop schema if exists api;
-- citext : laissée en place (extension inoffensive, peut être utilisée ailleurs).

-- 0010 — D-38 : voir supabase/rollback/20261026001000_d38_rls_auto_enable_hardening.rollback.sql
-- (rétablit EXECUTE à PUBLIC ; déconseillé : rouvre les alertes 0028/0029).

-- Après retour arrière : supprimer les lignes correspondantes de supabase_migrations.schema_migrations
-- (versions appliquées) pour garder l'historique cohérent avec le dépôt.
