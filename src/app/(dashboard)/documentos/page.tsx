'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, FileText, Search, ExternalLink, Trash2 } from 'lucide-react'
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

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este documento?')) return
    setDeleting(id)
    const supabase = createClient()
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

      {/* Filtros */}
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
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <FileText className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin documentos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const st = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pendiente
            const isVencido = doc.status === 'vencido'
            return (
              <div key={doc.id}
                className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{
                  background: isVencido ? 'rgba(255,107,107,0.04)' : '#ffffff',
                  border: `1px solid ${isVencido ? 'rgba(255,107,107,0.2)' : 'rgba(0,40,80,0.08)'}`,
                }}>

                {/* Ícono tipo */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                  <FileText className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold" style={{ color: '#1a2e3b' }}>{doc.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.04)', color: '#6b8fa0' }}>v{doc.version}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa' }}>
                      {doc.type}
                    </span>
                    {doc.companies?.name && (
                      <span className="text-xs" style={{ color: '#6b8fa0' }}>{doc.companies.name}</span>
                    )}
                    {doc.projects?.name && (
                      <span className="text-xs" style={{ color: '#6b8fa0' }}>· {doc.projects.name}</span>
                    )}
                    {doc.expires_at && (
                      <span className="text-xs" style={{ color: isVencido ? '#ff6b6b' : '#86a2b2' }}>
                        Vence: {formatDate(doc.expires_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                      style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255,107,107,0.08)', color: '#ff6b6b' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
