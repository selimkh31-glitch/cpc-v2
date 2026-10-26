-- D-40 (validé sous conditions) : vérification serveur de session toujours active pour les actions sensibles.
-- Un JWT reste valide jusqu'à son exp même après une déconnexion globale (doc Supabase « Signing out ») ;
-- cette vérification consulte auth.sessions à chaque appel pour refuser immédiatement une session révoquée.
-- Elle ne rend PAS le JWT invalide ailleurs : elle s'utilise explicitement dans les actions sensibles.

create function private.session_is_active(p_session_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1
      from auth.sessions s
     where s.id = p_session_id
       and (s.not_after is null or s.not_after > now())
  )
$$;
revoke execute on function private.session_is_active(uuid) from public, anon, authenticated, service_role;
comment on function private.session_is_active(uuid) is
  'D-40 : vrai si la session existe encore et n''a pas expiré (auth.sessions). Interne, non appelable par les clients.';

-- Commande exposée : vérifie la session portée par le JWT de l'appelant (aucun paramètre, aucun IDOR possible).
create function api.assert_session_active()
  returns boolean
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_session uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  begin
    v_session := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if v_session is null then
    return false;
  end if;
  return private.session_is_active(v_session);
end
$$;
revoke execute on function api.assert_session_active() from public, anon, service_role;
grant execute on function api.assert_session_active() to authenticated;
comment on function api.assert_session_active() is
  'D-40 : à appeler dans les actions sensibles. Faux si la session du JWT a été révoquée (déconnexion globale, suppression) même si le JWT n''a pas expiré.';
