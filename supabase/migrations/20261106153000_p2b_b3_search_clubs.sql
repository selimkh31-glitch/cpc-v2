-- CPC V2 · P2-B / B3 : recherche réelle de clubs.
-- La fonction est SECURITY INVOKER : les policies RLS B1/B2 s'appliquent effectivement.
-- Aucun index pg_trgm, aucune extension unaccent (D-48, faible volume V1).
create function api.search_clubs(
  p_q text default null,
  p_platform public.platform default null,
  p_recruiting_only boolean default true,
  p_position public.position_code default null,
  p_languages text[] default null,
  p_level public.club_level default null,
  p_cursor_recruiting boolean default null,
  p_cursor_name text default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
) returns jsonb
  language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_q text;
  v_limit integer := coalesce(p_limit, 20);
  v_cursor_active boolean := false;
  v_row record;
  v_count integer := 0;
  v_items jsonb := '[]'::jsonb;
  v_next text;
  v_last_r boolean;
  v_last_n text;
  v_last_i uuid;
begin
  -- Onboarding vérifié sans fonction privée : fonction INVOKER et RLS de profiles.
  if v_uid is null or not exists (
      select 1 from public.profiles p where p.id = v_uid and p.deleted_at is null
  ) then
    raise exception using message = 'UNAUTHENTICATED', errcode = 'P0001';
  end if;
  if v_limit not between 1 and 20 then
    raise exception using message = 'VALIDATION', detail = 'Limite hors bornes', errcode = 'P0001';
  end if;
  if p_languages is not null and (
    cardinality(p_languages) not between 1 and 3
    or exists (select 1 from unnest(p_languages) as x(l)
               where x.l is null or x.l !~ '^[a-z]{2}$')
  ) then
    raise exception using message = 'VALIDATION', detail = 'Filtre de langue invalide', errcode = 'P0001';
  end if;
  if p_cursor_recruiting is not null or p_cursor_name is not null or p_cursor_id is not null then
    if p_cursor_recruiting is null or p_cursor_name is null or p_cursor_id is null then
      raise exception using message = 'VALIDATION', detail = 'Curseur incomplet', errcode = 'P0001';
    end if;
    v_cursor_active := true;
  end if;

  -- Même normalisation que B2 : le texte client est toujours revalidé côté serveur.
  if p_q is not null then
    if char_length(p_q) > 32 then
      raise exception using message = 'VALIDATION', detail = 'Recherche trop longue', errcode = 'P0001';
    end if;
    v_q := pg_catalog.translate(p_q,
      'ÀÁÂÃÄÅĀÇĆČÈÉÊËĒĖĘÌÍÎÏĪÑŃÒÓÔÕÖØŌÙÚÛÜŪÝŸŽŹŻŠŚÆŒẞ',
      'àáâãäåāçćčèéêëēėęìíîïīñńòóôõöøōùúûüūýÿžźżšśæœß');
    v_q := pg_catalog.lower(v_q collate "C");
    v_q := pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(v_q,'œ','oe'),'æ','ae'),'ß','ss');
    v_q := pg_catalog.translate(v_q,
      'àáâãäåāçćčèéêëēėęìíîïīñńòóôõöøōùúûüūýÿžźżšś',
      'aaaaaaaccceeeeeeeiiiiinnooooooouuuuuyyzzzss');
    v_q := pg_catalog.btrim(pg_catalog.regexp_replace(v_q, '[[:space:]]+', ' ', 'g'));
    if char_length(v_q) < 2 then v_q := null; end if;
  end if;

  for v_row in
    select c.id, c.name, c.slug::text as slug, c.platform, c.languages, c.level,
           c.recruiting_open, c.recruiting_positions, c.search_name,
           (select count(*)::integer from public.club_memberships m
            where m.club_id = c.id and m.is_active) as member_count,
           exists (select 1 from public.club_memberships m
                   where m.club_id = c.id and m.is_active and m.profile_id = v_uid) as viewer_is_member
      from public.clubs c
     where c.status = 'active'
       and (p_platform is null or c.platform = p_platform)
       and (not coalesce(p_recruiting_only, true) or c.recruiting_open)
       and (p_position is null or p_position = any(c.recruiting_positions))
       and (p_languages is null or c.languages && p_languages)
       and (p_level is null or c.level = p_level)
       and (v_q is null or pg_catalog.strpos(c.search_name, v_q) > 0)
       and (not v_cursor_active
         or (p_cursor_recruiting and not c.recruiting_open)
         or (c.recruiting_open = p_cursor_recruiting
             and (c.search_name, c.id) > (p_cursor_name, p_cursor_id)))
     order by c.recruiting_open desc, c.search_name asc, c.id asc
     limit v_limit + 1
  loop
    if v_count = v_limit then
      -- Le curseur reprend la DERNIÈRE ligne rendue, pas la ligne supplémentaire.
      v_next := pg_catalog.rtrim(
        pg_catalog.translate(
          pg_catalog.replace(
            pg_catalog.encode(pg_catalog.convert_to(
              pg_catalog.jsonb_build_object('r',v_last_r,'n',v_last_n,'i',v_last_i)::text,
              'UTF8'), 'base64'),
            pg_catalog.chr(10), ''),
          '+/', '-_'),
        '=');
      exit;
    end if;

    v_items := v_items || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', v_row.id, 'name', v_row.name, 'slug', v_row.slug,
        'platform', v_row.platform, 'languages', v_row.languages,
        'level', v_row.level, 'recruiting_open', v_row.recruiting_open,
        'recruiting_positions', v_row.recruiting_positions,
        'member_count', v_row.member_count, 'viewer_is_member', v_row.viewer_is_member
      )
    );
    v_last_r := v_row.recruiting_open;
    v_last_n := v_row.search_name;
    v_last_i := v_row.id;
    v_count := v_count + 1;
  end loop;

  return pg_catalog.jsonb_build_object(
    'data', pg_catalog.jsonb_build_object('items',v_items,'next_cursor',v_next),
    'server_now', now());
end;
$$;

revoke execute on function api.search_clubs(text,public.platform,boolean,public.position_code,text[],public.club_level,boolean,text,uuid,integer)
  from public, anon, service_role;
grant execute on function api.search_clubs(text,public.platform,boolean,public.position_code,text[],public.club_level,boolean,text,uuid,integer)
  to authenticated;

comment on function api.search_clubs(text,public.platform,boolean,public.position_code,text[],public.club_level,boolean,text,uuid,integer)
  is 'Explorer Clubs D-48 : recherche et pagination sous RLS, données authentiques, au plus 20 résultats.';
