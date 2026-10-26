-- Durcissement révélé par l'inventaire C-1 (26/10/2026) : `alter default privileges IN SCHEMA … revoke … from public`
-- n'a aucun effet (les droits par défaut d'un schéma ne peuvent qu'AJOUTER à ceux du rôle). Le défaut Postgres
-- « EXECUTE à PUBLIC » s'appliquait donc à toute nouvelle fonction créée par postgres, y compris dans api.
-- Désormais : aucune fonction future n'est exécutable par PUBLIC sans GRANT explicite (ADR-0004 R2).
alter default privileges for role postgres revoke execute on functions from public;
