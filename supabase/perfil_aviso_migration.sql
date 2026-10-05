-- ============================================================
-- LCL — Aviso "Completa tu perfil" (una sola vez por envío)
-- Correr en Supabase SQL Editor. Idempotente.
-- ============================================================
--
-- El aviso sale al entrar a la app si:
--   perfil_aviso_visto_at IS NULL                      (nunca lo ha visto), o
--   perfil_aviso_enviado_at > perfil_aviso_visto_at    (un admin lo reenvió).
-- Al guardar o dar "Más tarde" se marca visto → no vuelve a salir.
-- "Reenviar" desde Equipo (admin) pone enviado_at = now() y suma 1 al contador.

alter table profiles add column if not exists perfil_aviso_visto_at   timestamptz;
alter table profiles add column if not exists perfil_aviso_enviado_at timestamptz;
alter table profiles add column if not exists perfil_aviso_envios     integer not null default 0;
