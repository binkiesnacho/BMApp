-- =============================================================================
-- BMApp — Migración 0025: sesión de entrenamiento (faltas con hora) + adjuntos
--
--  * trainings.attendance_taken_at / attendance_by: cuándo y quién pasó lista.
--    Así otros entrenadores/admins saben a qué hora se subieron las faltas.
--  * training_files: fotos y PDFs subidos a un entrenamiento (Storage privado).
-- Ejecutar sobre una BD con 0001–0024 aplicadas.
-- =============================================================================

-- ---- 1) Marca de cuándo se pasó lista ---------------------------------------
alter table public.trainings
  add column if not exists attendance_taken_at timestamptz,
  add column if not exists attendance_by uuid references public.profiles(id) on delete set null;

-- ---- 2) Adjuntos del entrenamiento ------------------------------------------
create table if not exists public.training_files (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  /** Ruta dentro del bucket 'training-files'. */
  path text not null,
  name text not null,
  mime text not null,
  size_bytes integer,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists training_files_training_idx on public.training_files(training_id);

alter table public.training_files enable row level security;

drop policy if exists training_files_select on public.training_files;
create policy training_files_select on public.training_files
  for select using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id and public.can_view_team(t.team_id)
    )
  );

drop policy if exists training_files_write on public.training_files;
create policy training_files_write on public.training_files
  for all
  using (
    exists (
      select 1 from public.trainings t
      where t.id = training_id and public.can_capture_team(t.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.trainings t
      where t.id = training_id and public.can_capture_team(t.team_id)
    )
  );

-- ---- 3) Bucket privado para los adjuntos ------------------------------------
-- Privado: el contenido de entrenamiento no debe ser accesible por URL pública.
-- Se sirve con URLs firmadas de corta duración desde la app.
insert into storage.buckets (id, name, public)
values ('training-files', 'training-files', false)
on conflict (id) do nothing;

-- Las rutas son '<training_id>/<fichero>': la primera carpeta identifica el
-- entrenamiento, y de ahí derivamos el equipo para aplicar los permisos.
drop policy if exists "training_files_read" on storage.objects;
create policy "training_files_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'training-files'
    and exists (
      select 1 from public.trainings t
      where t.id::text = (storage.foldername(name))[1]
        and public.can_view_team(t.team_id)
    )
  );

drop policy if exists "training_files_insert" on storage.objects;
create policy "training_files_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'training-files'
    and exists (
      select 1 from public.trainings t
      where t.id::text = (storage.foldername(name))[1]
        and public.can_capture_team(t.team_id)
    )
  );

drop policy if exists "training_files_delete" on storage.objects;
create policy "training_files_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'training-files'
    and exists (
      select 1 from public.trainings t
      where t.id::text = (storage.foldername(name))[1]
        and public.can_capture_team(t.team_id)
    )
  );
