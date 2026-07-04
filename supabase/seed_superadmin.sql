-- =============================================================================
-- BMApp — Designar al ADMINISTRADOR GLOBAL (super-admin)
--
-- IMPORTANTE: ejecutar DESPUÉS de haberte registrado en la app con este email.
-- (Regístrate en /login → "Crear cuenta". Luego pega esto en el SQL Editor.)
--
-- Cambia el email si vas a usar otro. Solo debería haber UN super-admin.
-- =============================================================================

update public.profiles p
set is_superadmin = true
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('nachorodrigosanmartin@gmail.com');

-- Verificación: debe devolver tu fila con is_superadmin = true
select p.id, u.email, p.role, p.is_superadmin, p.club_id
from public.profiles p
join auth.users u on u.id = p.id
where p.is_superadmin = true;
