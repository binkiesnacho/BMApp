-- 0019: Observaciones de partido (comentarios del cuerpo técnico).
-- Lectura: quien ve el equipo del partido. Escritura/borrado: quien gestiona el
-- equipo (admin o entrenador del equipo).
create table if not exists public.match_comments (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists match_comments_match_id_idx
  on public.match_comments (match_id);

alter table public.match_comments enable row level security;

drop policy if exists match_comments_select on public.match_comments;
create policy match_comments_select on public.match_comments
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_view_team(m.team_id)
    )
  );

drop policy if exists match_comments_insert on public.match_comments;
create policy match_comments_insert on public.match_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_manage_team(m.team_id)
    )
  );

drop policy if exists match_comments_delete on public.match_comments;
create policy match_comments_delete on public.match_comments
  for delete using (
    author_id = auth.uid()
    or exists (
      select 1 from public.matches m
      where m.id = match_id and public.can_manage_team(m.team_id)
    )
  );
