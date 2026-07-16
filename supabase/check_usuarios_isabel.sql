-- ============================================================
-- LCL — Revisar usuarios / arreglar nombre de Isabel
-- Correr por PASOS en Supabase SQL Editor.
-- ============================================================

-- PASO 1 — ¿Quién existe? Cruza el login (auth.users) con el perfil (profiles).
select
  u.email,
  p.full_name,
  p.role,
  u.created_at as login_creado,
  u.last_sign_in_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.email;

-- PASO 2 — Si Isabel YA aparece arriba con su email (p.ej. isabel@lcl.com),
-- solo corrige el nombre:
-- update public.profiles set full_name = 'Isabel Llano'
-- where email = 'isabel@lcl.com';

-- PASO 3 — Si Isabel NO aparece (no tiene login):
--   Crearla desde el Dashboard → Authentication → Users → "Add user":
--     email: isabel@lcl.com   ·   password: Lcl2026!   ·   Auto Confirm: ON
--   Eso dispara el trigger que crea su fila en profiles. Luego corre el PASO 2
--   para dejar el nombre como 'Isabel Llano' (y el rol si hace falta):
-- update public.profiles set full_name = 'Isabel Llano', role = 'consultant'
-- where email = 'isabel@lcl.com';
