-- S-1.9 — Avatars privés (ADR-0015). Bucket `crests` reporté à la Phase 2 (aucun club n'existe encore).
-- Lecture uniquement par URL signée courte (générée côté serveur avec le JWT de l'utilisateur).

-- 1) Bucket privé : aucune lecture publique, ≤ 2 Mo, PNG/JPEG/WebP uniquement (SVG interdit).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Chemin imposé : `{uid}/{uuid}.{png|jpg|webp}` (nom généré côté serveur).
create function private.avatar_path_is_valid(p_name text)
  returns boolean
  language sql
  immutable
  set search_path = ''
as $$
  select p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
$$;
revoke execute on function private.avatar_path_is_valid(text) from public, anon, authenticated, service_role;

-- 3) Visibilité d'un avatar : propriétaire, ou profil cible existant et non supprimé.
--    (Les blocages, Phase 5, s'ajouteront ici.)
create function private.avatar_is_visible(p_name text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.profiles p
       where p.id::text = split_part(p_name, '/', 1)
         and p.deleted_at is null
    )
  )
$$;
revoke execute on function private.avatar_is_visible(text) from public, anon, authenticated, service_role;

-- Les policies storage s'exécutent avec le rôle de l'appelant : il faut l'USAGE sur private pour
-- appeler ces deux fonctions. On l'évite en les rendant appelables via un schéma dédié non exposé.
create schema if not exists storage_policies;
revoke all on schema storage_policies from public;
grant usage on schema storage_policies to authenticated;

create function storage_policies.avatar_readable(p_name text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$ select private.avatar_is_visible(p_name) $$;
create function storage_policies.avatar_writable(p_name text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select auth.uid() is not null
     and private.avatar_path_is_valid(p_name)
     and split_part(p_name, '/', 1) = auth.uid()::text
$$;
revoke execute on function storage_policies.avatar_readable(text) from public, anon, service_role;
revoke execute on function storage_policies.avatar_writable(text) from public, anon, service_role;
grant execute on function storage_policies.avatar_readable(text) to authenticated;
grant execute on function storage_policies.avatar_writable(text) to authenticated;

-- 4) Policies storage.objects (anon : aucune).
create policy avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and storage_policies.avatar_readable(name));
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and storage_policies.avatar_writable(name));
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and storage_policies.avatar_writable(name))
  with check (bucket_id = 'avatars' and storage_policies.avatar_writable(name));
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and storage_policies.avatar_writable(name));

-- 5) Le profil ne peut référencer qu'un objet de son propre dossier. Expression inline : une contrainte
--    s'évalue avec les droits de l'appelant, qui n'a pas accès au schéma private.
alter table public.profiles
  add constraint profiles_avatar_path_owner check (
    avatar_path is null
    or avatar_path ~ ('^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$')
  );
