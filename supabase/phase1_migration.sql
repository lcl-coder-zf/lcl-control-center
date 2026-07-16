-- ====================================================
-- LCL Phase 1 Migration: Documents approval workflow
-- Ejecutar en Supabase SQL Editor (en orden)
-- ====================================================

-- 1. Fix documents.status constraint (faltaban en_revision y rechazado)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check
  CHECK (status IN ('pendiente','en_revision','aprobado','rechazado','vencido'));

-- 2. Add file_size column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size bigint;

-- 3. Asegurarse que folder_id existe (por si acaso)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;

-- 4. Historial de versiones
CREATE TABLE IF NOT EXISTS document_versions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  version_number  integer NOT NULL DEFAULT 1,
  file_url        text NOT NULL,
  file_name       text NOT NULL,
  file_size       bigint,
  uploaded_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dversions_select" ON document_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "dversions_insert" ON document_versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dversions_update" ON document_versions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dversions_delete" ON document_versions FOR DELETE TO authenticated USING (true);

-- 5. Historial de aprobaciones (audit trail)
CREATE TABLE IF NOT EXISTS document_approvals (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  action          text NOT NULL CHECK (action IN ('submitted','approved','rejected','changes_requested')),
  performed_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dapprovals_select" ON document_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "dapprovals_insert" ON document_approvals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dapprovals_update" ON document_approvals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dapprovals_delete" ON document_approvals FOR DELETE TO authenticated USING (true);
