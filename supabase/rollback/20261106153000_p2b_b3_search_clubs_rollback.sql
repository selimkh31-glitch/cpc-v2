-- B3 : retrait de la recherche (aucune donnée à supprimer).
-- Exécution uniquement sur autorisation expresse ; ne touche pas aux tables.
begin;
drop function if exists api.search_clubs(text,public.platform,boolean,public.position_code,text[],public.club_level,boolean,text,uuid,integer);
commit;
