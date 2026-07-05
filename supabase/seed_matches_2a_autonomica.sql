-- =============================================================================
-- BMApp — Carga de resultados 2ª Autonómica Masculina 2025/2026 (Norte 1)
-- CBM Quart: Senior A = Energy Self, Senior B = IPS Prevención
-- (Se omiten los 2 partidos contra "Equipo retirado (CH Vilareal B)": no jugados)
-- =============================================================================

-- Limpia el partido de prueba de Senior A antes de cargar los reales.
delete from public.matches
where team_id = 'e20c0851-59bf-4e60-8bdc-f4af75398adf';

-- ---- SENIOR A (Energy Self CBM Quart) --------------------------------------
insert into public.matches (team_id, opponent, date, status, our_score, opp_score) values
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'IPS Prevención CBM Quart',        '2025-10-04T18:00:00+01:00', 'finished', 33, 18),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'CBM Benaguasil',                  '2025-10-18T18:00:00+01:00', 'finished', 44, 23),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'CH Oliva',                        '2025-10-25T18:00:00+01:00', 'finished', 24, 17),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Caixa Rural CH Nules',           '2025-11-08T18:00:00+01:00', 'finished', 33, 19),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Family Cash Alzira',             '2025-11-15T18:00:00+01:00', 'finished', 36, 17),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Giticsa Loriguilla-Burjassot',   '2025-11-22T18:00:00+01:00', 'finished', 34, 25),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Integrum Alto Palancia',         '2025-12-13T18:00:00+01:00', 'finished', 45, 22),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Serifruit H. Betxí',             '2025-12-20T18:00:00+01:00', 'finished', 31, 29),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'IPS Prevención CBM Quart',        '2026-01-17T18:00:00+01:00', 'finished', 39, 19),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'CBM Benaguasil',                  '2026-01-24T18:00:00+01:00', 'finished', 37, 19),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'CH Oliva',                        '2026-01-31T18:00:00+01:00', 'finished', 36, 29),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Caixa Rural CH Nules',           '2026-02-14T18:00:00+01:00', 'finished', 29, 25),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Family Cash Alzira',             '2026-02-21T18:00:00+01:00', 'finished', 34, 23),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Giticsa Loriguilla-Burjassot',   '2026-02-28T18:00:00+01:00', 'finished', 29, 24),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Integrum Alto Palancia',         '2026-03-14T18:00:00+01:00', 'finished', 29, 24),
('e20c0851-59bf-4e60-8bdc-f4af75398adf', 'Serifruit H. Betxí',             '2026-03-28T18:00:00+01:00', 'finished', 29, 25);

-- ---- SENIOR B (IPS Prevención CBM Quart) -----------------------------------
insert into public.matches (team_id, opponent, date, status, our_score, opp_score) values
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Energy Self CBM Quart',          '2025-10-04T18:00:00+01:00', 'finished', 18, 33),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Giticsa Loriguilla-Burjassot',   '2025-10-18T18:00:00+01:00', 'finished', 14, 35),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'CBM Benaguasil',                  '2025-10-25T18:00:00+01:00', 'finished', 19, 19),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'CH Oliva',                        '2025-11-15T18:00:00+01:00', 'finished', 24, 35),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Integrum Alto Palancia',         '2025-11-22T18:00:00+01:00', 'finished', 26, 30),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Caixa Rural CH Nules',           '2025-11-29T18:00:00+01:00', 'finished', 21, 24),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Serifruit H. Betxí',             '2025-12-13T18:00:00+01:00', 'finished', 19, 30),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Family Cash Alzira',             '2025-12-20T18:00:00+01:00', 'finished', 22, 32),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Energy Self CBM Quart',          '2026-01-17T18:00:00+01:00', 'finished', 19, 39),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Giticsa Loriguilla-Burjassot',   '2026-01-24T18:00:00+01:00', 'finished', 17, 27),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'CBM Benaguasil',                  '2026-01-31T18:00:00+01:00', 'finished', 17, 18),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'CH Oliva',                        '2026-02-21T18:00:00+01:00', 'finished', 26, 31),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Integrum Alto Palancia',         '2026-02-28T18:00:00+01:00', 'finished', 29, 23),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Caixa Rural CH Nules',           '2026-03-07T18:00:00+01:00', 'finished', 28, 37),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Serifruit H. Betxí',             '2026-03-14T18:00:00+01:00', 'finished', 28, 38),
('eeee71b4-fa7a-491b-9ca6-a3cc949467d6', 'Family Cash Alzira',             '2026-03-28T18:00:00+01:00', 'finished', 23, 28);
