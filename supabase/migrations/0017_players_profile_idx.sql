-- 0017: índice para buscar fichas por cuenta (players.profile_id).
-- getMyFichaId / getMyTeams lo consultan en el layout en cada navegación.
create index if not exists players_profile_id_idx
  on public.players (profile_id) where profile_id is not null;
