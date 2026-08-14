-- ============================================================
-- RBAC completo (port del Control Tower de Jamar)
--   · roles_app         → roles gestionables desde la app, con lista de módulos
--   · modulos_sistema   → prender/apagar un módulo globalmente
--   · profiles.modulos_override → override de acceso por usuario (JSONB)
--   · profiles.activo   → desactivar un usuario sin borrarlo
--   · usuarios_sistema  → vault de logins (email+pass) creados desde la app
-- Idempotente. Correr en Supabase → SQL Editor.
-- ============================================================

-- ── 1. Liberar profiles.role del CHECK de 2 valores ──
-- Hoy es: role text check (role in ('admin','consultant')). Para permitir
-- roles nuevos (cualquier slug) quitamos el CHECK. La validez del rol pasa a
-- vivir en roles_app (FK lógica, no dura, para no bloquear el trigger).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ── 2. Columnas nuevas en profiles ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS modulos_override jsonb DEFAULT NULL;
COMMENT ON COLUMN profiles.modulos_override IS
  'Overrides de acceso por módulo. Ej: {"vault": true, "tareas": false}. NULL = usar permisos del rol.';

-- ── 3. roles_app ──
CREATE TABLE IF NOT EXISTS roles_app (
  slug        text PRIMARY KEY,
  nombre      text NOT NULL,
  descripcion text,
  color       text DEFAULT 'bg-slate-600 text-white',
  modulos     text[] DEFAULT NULL,   -- slugs permitidos. NULL = usar defaults del código (lib/modulos.ts)
  es_sistema  boolean DEFAULT false, -- true = rol base (no se puede borrar)
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Seed de los 2 roles de sistema de LCL. modulos = NULL → usan defaults del código.
INSERT INTO roles_app (slug, nombre, descripcion, color, es_sistema) VALUES
  ('admin',      'Super admin', 'Acceso total al sistema',         'bg-[#1a2e3b] text-white', true),
  ('consultant', 'Consultor',   'Acceso a los módulos operativos', 'bg-[#40b5fa] text-white', true)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION update_roles_app_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_roles_app_updated_at ON roles_app;
CREATE TRIGGER trg_roles_app_updated_at
  BEFORE UPDATE ON roles_app
  FOR EACH ROW EXECUTE FUNCTION update_roles_app_updated_at();

ALTER TABLE roles_app ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_app_select_auth ON roles_app;
CREATE POLICY roles_app_select_auth ON roles_app
  FOR SELECT TO authenticated USING (true);
-- Escrituras solo por la API con service role (bypassa RLS).

-- ── 4. modulos_sistema (prender/apagar global) ──
-- Sin fila para un slug = módulo ACTIVO. Solo se guardan los apagados.
CREATE TABLE IF NOT EXISTS modulos_sistema (
  slug        text PRIMARY KEY,
  activo      boolean NOT NULL DEFAULT true,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE modulos_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modulos_sistema_select ON modulos_sistema;
CREATE POLICY modulos_sistema_select ON modulos_sistema
  FOR SELECT TO authenticated USING (true);

-- ── 5. usuarios_sistema (vault de logins) ──
-- Guarda el login+contraseña en claro de los usuarios creados desde la app.
-- RLS sin políticas → solo el service role (endpoint admin) lo lee/escribe.
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      text NOT NULL,
  email       text NOT NULL UNIQUE,
  pass        text NOT NULL,
  rol         text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;

-- La siembra de los logins actuales (con contraseñas reales) va en
-- supabase/usuarios_sistema_seed.local.sql (GITIGNORED — el repo es público).
-- Correr ese archivo aparte en el SQL Editor.
