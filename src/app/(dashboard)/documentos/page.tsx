'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, FileText, Search, Download, Trash2, Folder, FolderOpen, List, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aprobado: { label: 'Aprobado', color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
  pendiente: { label: 'Pendiente', color: '#ffd93d', bg: 'rgba(255,217,61,0.10)' },
  vencido:   { label: 'Vencido',   color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('todos')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [view, setView] = useState<'lista' | 'carpetas'>('carpetas')
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())

  useEffect(() => { fetchDocs() }, [])

  function fetchDocs() {
    const supabase = createClient()
    supabase
      .from('documents')
      .select('*, companies(id, name), projects(id, name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setDocs(data ?? []); setLoading(false) })
  }

  const filtered = useMemo(() => {
    return docs.filter(d => {
      const matchStatus = status === 'todos' || d.status === status
      const matchQ = !q || d.name.toLowerCase().includes(q.toLowerCase()) || d.type.toLowerCase().includes(q.toLowerCase())
      return matchStatus && matchQ
    })
  }, [docs, status, q])

  const counts = {
    aprobado: docs.filter(d => d.status === 'aprobado').length,
    pendiente: docs.filter(d => d.status === 'pendiente').length,
    vencido:   docs.filter(d => d.status === 'vencido').length,
  }

  // Agrupar por cliente para vista carpetas
  const byCompany = useMemo(() => {
    const groups: Record<string, { name: string; docs: any[] }> = {}
    filtered.forEach(doc => {
      const key = doc.company_id ?? '__general__'
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

  async function handleDelete(id: string, fileUrl: string | null) {
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
    fetchDocs()
    setDeleting(null)
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 05</p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Documentos</h1>
          <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>{filtered.length} documento{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/documentos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#40b5fa', color: '#ffffff' }}>
          <Plus className="w-4 h-4" />Nuevo documento
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Aprobados', value: counts.aprobado, color: '#4ade80' },
          { label: 'Pendientes', value: counts.pendiente, color: '#ffd93d' },
          { label: 'Vencidos',   value: counts.vencido,   color: '#ff6b6b' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <span className="text-xs uppercase tracking-wider" style={{ color: '#6b8fa0' }}>{s.label}</span>
            <span className="text-xl font-black" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filtros + toggle vista */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b8fa0' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar documento..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
        </div>
        <div className="flex gap-2">
          {['todos', 'aprobado', 'pendiente', 'vencido'].map(s => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button key={s} onClick={() => setStatus(s)}
                className="px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                style={{
                  background: status === s ? (cfg ? cfg.bg : 'rgba(64,181,250,0.15)') : '#f4f7fa',
                  color: status === s ? (cfg ? cfg.color : '#40b5fa') : '#6b8fa0',
                  border: `1px solid ${status === s ? (cfg ? cfg.color + '40' : 'rgba(64,181,250,0.3)') : 'rgba(0,40,80,0.08)'}`,
                }}>
                {s}
              </button>
            )
          })}
        </div>
        {/* Toggle vista */}
        <div className="flex rounded-xl overflow-hidden ml-auto" style={{ border: '1px solid rgba(0,40,80,0.10)' }}>
          {([['carpetas', LayoutGrid], ['lista', List]] as const).map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all"
              style={{
                background: view === v ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                color: view === v ? '#40b5fa' : '#6b8fa0',
              }}>
              <Icon className="w-3.5 h-3.5" />
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <FileText className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin documentos</p>
          <p className="text-sm mt-1" style={{ color: '#86a2b2' }}>Sube el primer documento del cliente</p>
        </div>
      ) : view === 'carpetas' ? (
        /* Vista carpetas */
        <div className="space-y-3">
          {byCompany.map(([key, group]) => {
            const isOpen = openFolders.has(key)
            return (
              <div key={key} className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(0,40,80,0.08)' }}>
                {/* Carpeta header */}
                <button onClick={() => toggleFolder(key)}
                  className="w-full flex items-center gap-3 px-5 py-4 transition-all text-left"
                  style={{ background: isOpen ? 'rgba(64,181,250,0.04)' : '#ffffff' }}>
                  {isOpen
                    ? <FolderOpen className="w-5 h-5 flex-shrink-0" style={{ color: '#40b5fa' }} />
                    : <Folder className="w-5 h-5 flex-shrink-0" style={{ color: '#40b5fa' }} />}
                  <span className="font-semibold text-sm flex-1" style={{ color: '#1a2e3b' }}>{group.name}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                    {group.docs.length} doc{group.docs.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs ml-2" style={{ color: '#86a2b2' }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Docs de la carpeta */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(0,40,80,0.06)' }}>
                    {group.docs.map((doc, i) => (
                      <DocRow key={doc.id} doc={doc} onDelete={handleDelete} deleting={deleting}
                        style={{ borderTop: i > 0 ? '1px solid rgba(0,40,80,0.05)' : undefined, paddingLeft: '3.5rem' }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Vista lista */
        <div className="space-y-2">
          {filtered.map(doc => (
            <DocRow key={doc.id} doc={doc} onDelete={handleDelete} deleting={deleting} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocRow({ doc, onDelete, deleting, style }: {
  doc: any
  onDelete: (id: string, fileUrl: string | null) => void
  deleting: string | null
  style?: React.CSSProperties
}) {
  const st = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pendiente
  const isVencido = doc.status === 'vencido'

  async function getDownloadUrl() {
    if (!doc.file_url) return
    const supabase = createClient()
    const url = new URL(doc.file_url)
    const parts = url.pathname.split('/storage/v1/object/public/documents/')
    const path = parts[1]
    if (!path) { window.open(doc.file_url, '_blank'); return }
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3.5"
      style={{
        background: isVencido ? 'rgba(255,107,107,0.03)' : '#ffffff',
        ...style,
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa' }}>
        <FileText className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{doc.name}</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ background: st.bg, color: st.color }}>{st.label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.04)', color: '#6b8fa0' }}>v{doc.version}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(64,181,250,0.06)', color: '#40b5fa' }}>{doc.type}</span>
          {doc.projects?.name && (
            <span className="text-xs" style={{ color: '#6b8fa0' }}>{doc.projects.name}</span>
          )}
          {doc.expires_at && (
            <span className="text-xs" style={{ color: isVencido ? '#ff6b6b' : '#86a2b2' }}>
              Vence: {formatDate(doc.expires_at)}
            </span>
          )}
          {!doc.file_url && (
            <span className="text-xs" style={{ color: '#86a2b2' }}>Sin archivo</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {doc.file_url && (
          <button onClick={getDownloadUrl}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}
            title="Descargar">
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onDelete(doc.id, doc.file_url)} disabled={deleting === doc.id}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,107,107,0.08)', color: '#ff6b6b' }}
          title="Eliminar">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
