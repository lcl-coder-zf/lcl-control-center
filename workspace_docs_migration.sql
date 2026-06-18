-- ============================================================
-- workspace_docs: documentos editables por proyecto
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_docs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  name        TEXT NOT NULL DEFAULT 'Sin título',
  doc_type    TEXT NOT NULL DEFAULT 'documento'
              CHECK (doc_type IN ('documento','politica','procedimiento','acta','informe','lista_verificacion')),
  content     JSONB DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  status      TEXT NOT NULL DEFAULT 'borrador'
              CHECK (status IN ('borrador','en_revision','aprobado','rechazado')),
  version     TEXT DEFAULT '1.0',
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE workspace_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wdocs_select" ON workspace_docs FOR SELECT TO authenticated USING (true);
CREATE POLICY "wdocs_insert" ON workspace_docs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "wdocs_update" ON workspace_docs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "wdocs_delete" ON workspace_docs FOR DELETE TO authenticated USING (true);
