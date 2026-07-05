-- =============================================================================
-- BMApp — Migración 0011: logo del club + almacenamiento
-- Ejecutar sobre una BD con 0001–0010 aplicadas.
-- =============================================================================

-- URL pública del logo del club.
alter table public.clubs add column if not exists logo_url text;

-- Bucket público para los logos.
insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do nothing;

-- Políticas de storage: lectura pública; subida/edición/borrado solo admins.
drop policy if exists "club_logos_read" on storage.objects;
create policy "club_logos_read" on storage.objects
  for select using (bucket_id = 'club-logos');

drop policy if exists "club_logos_insert" on storage.objects;
create policy "club_logos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'club-logos' and public.is_admin());

drop policy if exists "club_logos_update" on storage.objects;
create policy "club_logos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'club-logos' and public.is_admin());

drop policy if exists "club_logos_delete" on storage.objects;
create policy "club_logos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'club-logos' and public.is_admin());
