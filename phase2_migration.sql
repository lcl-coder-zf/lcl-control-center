-- ====================================================
-- LCL Phase 2 Migration: Rejection notes
-- Ejecutar en Supabase SQL Editor
-- ====================================================

-- Nota de rechazo directamente en la fila (fácil de leer sin joins)
ALTER TABLE documents    ADD COLUMN IF NOT EXISTS rejection_note text;
ALTER TABLE workspace_docs ADD COLUMN IF NOT EXISTS rejection_note text;
