'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, FileText, Search, Download, Trash2, Folder, FolderOpen,
  List, LayoutGrid, PenLine, Shield, GitBranch, Users, BarChart3,
  CheckSquare, Clock, Eye, CheckCircle2, XCircle, ExternalLink,
  MousePointer2, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aprobado:    { label: 'Aprobado',    color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
  pendiente:   { label: 'Pendiente',   color: '#ffd93d', bg: 'rgba(255,217,61,0.10)' },
  vencido:     { label: 'Vencido',     color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
  en_revision: { label: 'En revisión', color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
  borrador:    { label: 'Borrador',    color: '#6b8fa0', bg: 'rgba(107,143,160,0.10)' },
  rechazado:   { label: 'Rechazado',   color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
}

const DOC_TYPE_CFG: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  documento:          { label: 'Documento',            Icon: FileText,    color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
  politica:           { label: 'Política',              Icon: Shield,      color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  procedimiento:      { label: 'Procedimiento',         Icon: GitBranch,   color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
  acta:               { label: 'Acta de reunión',       Icon: Users,       color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
  informe:            { label: 'Informe',                Icon: BarChart3,   color: '#ffd93d', bg: 'rgba(255,217,61,0.10)' },
  lista_verificacion: { label: 'Lista de verificación', Icon: CheckSquare, color: '#2dd4bf', bg: 'rgba(45,212,191,0.10)' },
  archivo:            { label: 'Archivo',               Icon: FileText,    color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
}

interface UploadedDoc {
  kind: 'uploaded'
  id: string; name: string; status: string; file_url: string; version: string
  type: string; created_at: string; expires_at?: string
  companies?: { id: string; name: string }
  projects?: { id: string; name: string }
}

interface WorkspaceDoc {
  kind: 'workspace'
  id: string; name: string; status: string; doc_type: string; version: string
  updated_at: string
  companies?: { id: string; name: string }
  projects?: { id: string; name: string }
}

type AnyDoc = UploadedDoc | WorkspaceDoc

export default function DocumentosPage() {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [workspaceDocs, setWorkspaceDocs] = useState<WorkspaceDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('todos')
  const [kind, setKind] = useState<'todos' | 'archivo' | 'editable'>('todos')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [view, setView] = useState<'lista' | 'carpetas'>('carpetas')
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const supabase = createClient()
    const [{ data: ud }, { data: wd }] = await Promise.all([
      supabase.from('documents')
        .select('*, companies(id, name), projects(id, name)')
        .order('created_at', { ascending: false }),
      supabase.from('workspace_docs')
        .select('id, name, status, doc_type, version, updated_at, projects(id, name, companies(id, name))')
        .order('updated_at', { ascending: false }),
    ])

    setUploadedDocs((ud ?? []).map((d: any) => ({ ...d, kind: 'uploaded' })))
    setWorkspaceDocs((wd ?? []).map((d: any) => ({
      ...d,
      kind: 'workspace',
      companies: d.projects?.companies,
      projects: d.projects ? { id: d.projects.id, name: d.projects.name } : undefined,
    })))
    setLoading(false)
  }

  const allDocs: AnyDoc[] = useMemo(() => {
    const uDocs = uploadedDocs.map(d => ({ ...d, kind: 'uploaded' as const }))
    const wDocs = workspaceDocs.map(d => ({ ...d, kind: 'workspace' as const }))
    return [...uDocs, ...wDocs].sort((a, b) => {
      const dateA = a.kind === 'uploaded' ? a.created_at : a.updated_at
      const dateB = b.kind === 'uploaded' ? b.created_at : b.updated_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }, [uploadedDocs, workspaceDocs])

  const filtered = useMemo(() => {
    return allDocs.filter(d => {
      const name     = d.name.toLowerCase()
      const matchQ   = !q || name.includes(q.toLowerCase())
      const matchSt  = status === 'todos' || d.status === status
      const matchKind = kind === 'todos'
        || (kind === 'archivo' && d.kind === 'uploaded')
        || (kind === 'editable' && d.kind === 'workspace')
      return matchQ && matchSt && matchKind
    })
  }, [allDocs, status, q, kind])

  const counts = useMemo(() => ({
    aprobado:    allDocs.filter(d => d.status === 'aprobado').length,
    pendiente:   allDocs.filter(d => d.status === 'pendiente').length,
    en_revision: allDocs.filter(d => d.status === 'en_revision').length,
    borrador:    allDocs.filter(d => d.status === 'borrador').length,
    vencido:     allDocs.filter(d => d.status === 'vencido').length,
    editables:   workspaceDocs.length,
    archivos:    uploadedDocs.length,
  }), [allDocs, workspaceDocs, uploadedDocs])

  // Group by company for folder view
  const byCompany = useMemo(() => {
    const groups: Record<string, { name: string; docs: AnyDoc[] }> = {}
    filtered.forEach(doc => {
      const key  = doc.companies?.id ?? '__general__'
      const name = doc.companies?.name ?? 'Sin cliente'
      if (!groups[key]) groups[key] = { name, docs: [] }
      groups[key].docs.push(doc)
    })
    return Object.entries(groups).sort(([, a], [, b]) => a.name.localeCompare(b.name))
  }, [filtered])

  function toggleFolder(key: string) {
    setOpenFolders(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // IDs de archivos uploaded en el orden actual de filtered (para shift+click)
  const uploadedFilteredIds = useMemo(
    () => filtered.filter(d => d.kind === 'uploaded').map(d => d.id),
    [filtered]
  )

  function toggleSelect(id: string, shiftKey = false) {
    const idx = uploadedFilteredIds.indexOf(id)
    setSelected(prev => {
      const next = new Set(prev)
      if (shiftKey && lastSelectedIdx !== null && idx !== -1) {
        const from = Math.min(lastSelectedIdx, idx)
        const to   = Math.max(lastSelectedIdx, idx)
        uploadedFilteredIds.slice(from, to + 1).forEach(i => next.add(i))
      } else {
        next.has(id) ? next.delete(id) : next.add(id)
      }
      return next
    })
    if (idx !== -1) setLastSelectedIdx(idx)
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
    setLastSelectedIdx(null)
  }

  async function handleBulkDelete() {
    const deletable = filtered.filter(d => d.kind === 'uploaded' && selected.has(d.id)) as UploadedDoc[]
    if (!deletable.length) return
    if (!confirm(`¿Eliminar ${deletable.length} documento${deletable.length !== 1 ? 's' : ''}?`)) return
    const supabase = createClient()
    for (const doc of deletable) {
      if (doc.file_url) {
        try {
          const url = new URL(doc.file_url)
          const pathParts = url.pathname.split('/storage/v1/object/sign/documents/')
          const storagePath = pathParts[1]?.split('?')[0]
          if (storagePath) await supabase.storage.from('documents').remove([storagePath])
        } catch {}
      }
      await supabase.from('documents').delete().eq('id', doc.id)
    }
    exitSelectMode()
    fetchAll()
  }

  async function handleDeleteUploaded(id: string, fileUrl: string | null) {
    if (!confirm('¿Eliminar este documento?')) return
    setDeleting(id)
    const supabase = createClient()
    if (fileUrl) {
      try {
        const url = new URL(fileUrl)
        const pathParts = url.pathname.split('/storage/v1/object/sign/documents/')
        const storagePath = pathParts[1]?.split('?')[0]
        if (storagePath) await supabase.storage.from('documents').remove([storagePath])
      } catch {}
    }
    await supabase.from('documents').delete().eq('id', id)
    fetchAll()
    setDeleting(null)
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 05</p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Documentos</h1>
          <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>
            {counts.archivos} archivo{counts.archivos !== 1 ? 's' : ''} · {counts.editables} editable{counts.editables !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: selectMode ? 'rgba(255,107,107,0.10)' : '#f4f7fa',
              color: selectMode ? '#ff6b6b' : '#6b8fa0',
              border: `1px solid ${selectMode ? 'rgba(255,107,107,0.25)' : 'rgba(0,40,80,0.10)'}`,
            }}>
            {selectMode ? <><X className="w-4 h-4" />Cancelar</> : <><MousePointer2 className="w-4 h-4" />Seleccionar</>}
          </button>
          <Link href="/documentos/nuevo"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            <Plus className="w-4 h-4" />Subir archivo
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Aprobados',    value: counts.aprobado,    color: '#4ade80', Icon: CheckCircle2 },
          { label: 'En revisión',  value: counts.en_revision, color: '#40b5fa', Icon: Eye },
          { label: 'Pendientes',   value: counts.pendiente,   color: '#ffd93d', Icon: Clock },
          { label: 'Vencidos',     value: counts.vencido,     color: '#ff6b6b', Icon: XCircle },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}18` }}>
              <s.Icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: '#86a2b2' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b8fa0' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar documento..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
        </div>

        {/* Kind filter */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,40,80,0.10)' }}>
          {([
            ['todos',    'Todos'],
            ['archivo',  'Archivos'],
            ['editable', 'Editables'],
          ] as const).map(([v, l]) => (
            <button key={v} onClick={() => setKind(v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all"
              style={{
                background: kind === v ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                color: kind === v ? '#40b5fa' : '#6b8fa0',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {['todos', 'aprobado', 'en_revision', 'pendiente', 'borrador', 'vencido'].map(s => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button key={s} onClick={() => setStatus(s)}
                className="px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                style={{
                  background: status === s ? (cfg ? cfg.bg : 'rgba(64,181,250,0.15)') : '#f4f7fa',
                  color: status === s ? (cfg ? cfg.color : '#40b5fa') : '#6b8fa0',
                  border: `1px solid ${status === s ? (cfg ? cfg.color + '40' : 'rgba(64,181,250,0.3)') : 'rgba(0,40,80,0.08)'}`,
                }}>
                {cfg?.label ?? 'Todos'}
              </button>
            )
          })}
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden ml-auto" style={{ border: '1px solid rgba(0,40,80,0.10)' }}>
          {([['carpetas', LayoutGrid, 'Carpetas'], ['lista', List, 'Lista']] as const).map(([v, Icon, l]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all"
              style={{
                background: view === v ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                color: view === v ? '#40b5fa' : '#6b8fa0',
              }}>
              <Icon className="w-3.5 h-3.5" />{l}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: 'rgba(64,181,250,0.07)', border: '1px solid rgba(64,181,250,0.18)' }}>
          <button
            onClick={() => {
              const allUploadedIds = filtered.filter(d => d.kind === 'uploaded').map(d => d.id)
              const allSelected = allUploadedIds.every(id => selected.has(id))
              if (allSelected) {
                setSelected(new Set())
              } else {
                setSelected(new Set(allUploadedIds))
              }
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
            {filtered.filter(d => d.kind === 'uploaded').every(d => selected.has(d.id)) ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <span className="text-sm flex-1" style={{ color: '#6b8fa0' }}>
            {selected.size > 0 ? `${selected.size} seleccionado${selected.size !== 1 ? 's' : ''}` : 'Selecciona documentos para realizar acciones'}
          </span>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' }}>
              <Trash2 className="w-4 h-4" />
              Eliminar {selected.size}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <FileText className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin documentos</p>
          <p className="text-sm mt-1" style={{ color: '#86a2b2' }}>Sube el primer documento o crea uno editable desde el proyecto</p>
        </div>
      ) : view === 'carpetas' ? (
        <div className="space-y-3">
          {byCompany.map(([key, group]) => {
            const isOpen = openFolders.has(key)
            return (
              <div key={key} className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(0,40,80,0.08)' }}>
                <button onClick={() => toggleFolder(key)}
                  className="w-full flex items-center gap-3 px-5 py-4 transition-all text-left"
                  style={{ background: isOpen ? 'rgba(64,181,250,0.04)' : '#ffffff' }}>
                  {isOpen
                    ? <FolderOpen className="w-5 h-5 flex-shrink-0" style={{ color: '#40b5fa' }} />
                    : <Folder className="w-5 h-5 flex-shrink-0" style={{ color: '#40b5fa' }} />}
                  <span className="font-semibold text-sm flex-1" style={{ color: '#1a2e3b' }}>{group.name}</span>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                    {group.docs.length} doc{group.docs.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs ml-2" style={{ color: '#86a2b2' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(0,40,80,0.06)' }}>
                    {group.docs.map((doc, i) => (
                      <UnifiedDocRow key={doc.id} doc={doc}
                        onDeleteUploaded={handleDeleteUploaded}
                        deleting={deleting}
                        selectMode={selectMode}
                        selected={selected.has(doc.id)}
                        onToggleSelect={toggleSelect}
                        style={{ borderTop: i > 0 ? '1px solid rgba(0,40,80,0.05)' : undefined, paddingLeft: '3.5rem' }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <UnifiedDocRow key={doc.id} doc={doc}
              onDeleteUploaded={handleDeleteUploaded}
              deleting={deleting}
              selectMode={selectMode}
              selected={selected.has(doc.id)}
              onToggleSelect={toggleSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

function UnifiedDocRow({ doc, onDeleteUploaded, deleting, selectMode, selected, onToggleSelect, style }: {
  doc: AnyDoc
  onDeleteUploaded: (id: string, fileUrl: string | null) => void
  deleting: string | null
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string, shiftKey: boolean) => void
  style?: React.CSSProperties
}) {
  const sc = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pendiente
  const isEditable = doc.kind === 'workspace'
  const docTypeCfg = isEditable
    ? (DOC_TYPE_CFG[(doc as WorkspaceDoc).doc_type] ?? DOC_TYPE_CFG.documento)
    : DOC_TYPE_CFG.archivo

  async function getDownloadUrl() {
    if (doc.kind !== 'uploaded' || !doc.file_url) return
    const supabase = createClient()
    try {
      const url = new URL(doc.file_url)
      const parts = url.pathname.split('/storage/v1/object/public/documents/')
      const path = parts[1]
      if (!path) { window.open(doc.file_url, '_blank'); return }
      const { data } = await supabase.storage.from('documents').createSignedUrl(path, 60)
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    } catch { window.open(doc.file_url, '_blank') }
  }

  const projectLink = doc.projects
    ? `/proyectos/${doc.projects.id}?tab=workspace`
    : null

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 transition-all"
      onClick={selectMode && doc.kind === 'uploaded' ? (e) => onToggleSelect?.(doc.id, e.shiftKey) : undefined}
      style={{
        background: selected ? 'rgba(64,181,250,0.06)' : '#ffffff',
        cursor: selectMode && doc.kind === 'uploaded' ? 'pointer' : 'default',
        ...style,
      }}>

      {/* Checkbox (select mode only, uploaded only) */}
      {selectMode && (
        <div className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: doc.kind === 'uploaded' ? (selected ? '#40b5fa' : 'rgba(0,40,80,0.20)') : 'transparent',
            background: selected ? '#40b5fa' : 'transparent',
          }}>
          {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
        </div>
      )}

      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: docTypeCfg.bg }}>
        <docTypeCfg.Icon className="w-4 h-4" style={{ color: docTypeCfg.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{doc.name}</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.04)', color: '#6b8fa0' }}>v{doc.version ?? '1.0'}</span>
          {isEditable && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(167,139,250,0.10)', color: '#a78bfa' }}>
              <PenLine className="w-2.5 h-2.5" />Editable
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: docTypeCfg.bg, color: docTypeCfg.color }}>{docTypeCfg.label}</span>
          {doc.projects?.name && (
            <span className="text-xs" style={{ color: '#6b8fa0' }}>{doc.projects.name}</span>
          )}
          {doc.kind === 'uploaded' && doc.expires_at && (
            <span className="text-xs" style={{ color: doc.status === 'vencido' ? '#ff6b6b' : '#86a2b2' }}>
              Vence: {formatDate(doc.expires_at)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isEditable && projectLink ? (
          <Link href={projectLink}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}
            title="Abrir en proyecto">
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        ) : doc.kind === 'uploaded' && doc.file_url ? (
          <button onClick={getDownloadUrl}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}
            title="Descargar">
            <Download className="w-3.5 h-3.5" />
          </button>
        ) : null}

        {doc.kind === 'uploaded' && (
          <button onClick={() => onDeleteUploaded(doc.id, doc.file_url ?? null)}
            disabled={deleting === doc.id}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,107,107,0.08)', color: '#ff6b6b' }}
            title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
