-- ROLLBACK D-38 — à n'exécuter que sur décision explicite de Selim.
-- Restaure les droits par défaut de la fonction de plateforme (EXECUTE à PUBLIC) et retire le commentaire.
-- Ne supprime ni la fonction ni l'event trigger ensure_rls.
grant execute on function public.rls_auto_enable() to public;
comment on function public.rls_auto_enable() is null;
