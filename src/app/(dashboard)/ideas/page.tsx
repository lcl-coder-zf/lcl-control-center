'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Lightbulb, Loader2, Archive, ArchiveRestore, Trash2, Pencil, Check, ListPlus, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Idea = any

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nueva, setNueva] = useState('')
  const [filtro, setFiltro] = useState<'nueva' | 'archivada'>('nueva')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const fetchIdeas = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('ideas')
      .select('*, profiles:autor_id(full_name)')
      .order('created_at', { ascending: false })
    return data ?? []
  }, [])

  useEffect(() => {
    fetchIdeas().then(d => { setIdeas(d); setLoading(false) })
  }, [fetchIdeas])

  const refresh = useCallback(async () => { setIdeas(await fetchIdeas()) }, [fetchIdeas])

  async function guardar() {
    const texto = nueva.trim()
    if (!texto) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ideas').insert([{ texto, autor_id: user?.id ?? null }])
    setNueva('')
    setSaving(false)
    await refresh()
  }

  async function cambiarEstado(id: string, estado: 'nueva' | 'archivada') {
    setBusy(id)
    const supabase = createClient()
    await supabase.from('ideas').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(null)
    await refresh()
  }

  async function guardarEdicion(id: string) {
    const texto = editText.trim()
    if (!texto) return
    setBusy(id)
    const supabase = createClient()
    await supabase.from('ideas').update({ texto, updated_at: new Date().toISOString() }).eq('id', id)
    setEditId(null); setEditText(''); setBusy(null)
    await refresh()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta idea?')) return
    setBusy(id)
    const supabase = createClient()
    await supabase.from('ideas').delete().eq('id', id)
    setBusy(null)
    await refresh()
  }

  const nuevas     = useMemo(() => ideas.filter(i => i.estado === 'nueva'), [ideas])
  const archivadas = useMemo(() => ideas.filter(i => i.estado === 'archivada'), [ideas])
  const lista      = filtro === 'nueva' ? nuevas : archivadas

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Captura rápida</p>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: '#1a2e3b' }}>
          <Lightbulb className="w-7 h-7" style={{ color: '#ffd93d' }} /> Ideas
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>Anota lo que se te ocurra antes de que se te olvide. Luego lo vuelves tarea.</p>
      </div>

      {/* Captura */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 mt-2.5 flex-shrink-0" style={{ color: '#40b5fa' }} />
          <textarea
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); guardar() } }}
            rows={2}
            placeholder="Escribe una idea… (⌘/Ctrl + Enter para guardar)"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={guardar} disabled={saving || !nueva.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            Guardar idea
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'nueva',     label: 'Ideas',      n: nuevas.length },
          { id: 'archivada', label: 'Archivadas', n: archivadas.length },
        ] as const).map(f => {
          const on = filtro === f.id
          return (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: on ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                color: on ? '#40b5fa' : '#6b8fa0',
                border: `1px solid ${on ? 'rgba(64,181,250,0.35)' : 'rgba(0,40,80,0.08)'}`,
              }}>
              {f.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: on ? 'rgba(64,181,250,0.18)' : 'rgba(0,40,80,0.06)', color: on ? '#40b5fa' : '#6b8fa0' }}>{f.n}</span>
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-16"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <Lightbulb className="w-10 h-10 mb-3" style={{ color: '#cfd9e3' }} />
          <p className="font-semibold text-sm" style={{ color: '#6b8fa0' }}>
            {filtro === 'nueva' ? 'Sin ideas todavía. ¡Anota la primera!' : 'No hay ideas archivadas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(idea => {
            const editando = editId === idea.id
            const autor = idea.profiles?.full_name as string | undefined
            return (
              <div key={idea.id} className="rounded-2xl px-4 py-3.5 transition-all"
                style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
                {editando ? (
                  <div>
                    <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ background: '#f4f7fa', border: '1px solid rgba(64,181,250,0.35)', color: '#1a2e3b' }} />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => { setEditId(null); setEditText('') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>Cancelar</button>
                      <button onClick={() => guardarEdicion(idea.id)} disabled={busy === idea.id || !editText.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#40b5fa' }}>
                        {busy === idea.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#1a2e3b' }}>{idea.texto}</p>
                    <div className="flex items-center justify-between gap-2 mt-2.5">
                      <span className="text-[11px]" style={{ color: '#86a2b2' }}>
                        {autor ? `${autor} · ` : ''}{formatDate(idea.created_at)}
                      </span>
                      <div className="flex items-center gap-1">
                        {idea.estado === 'nueva' && (
                          <Link href={`/tareas/nueva?titulo=${encodeURIComponent(idea.texto)}`} title="Convertir en tarea"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                            <ListPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">A tarea</span>
                          </Link>
                        )}
                        <button onClick={() => { setEditId(idea.id); setEditText(idea.texto) }} title="Editar"
                          className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity" style={{ color: '#40b5fa' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {idea.estado === 'nueva' ? (
                          <button onClick={() => cambiarEstado(idea.id, 'archivada')} disabled={busy === idea.id} title="Archivar"
                            className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity" style={{ color: '#6b8fa0' }}>
                            {busy === idea.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <button onClick={() => cambiarEstado(idea.id, 'nueva')} disabled={busy === idea.id} title="Restaurar"
                            className="p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity" style={{ color: '#40b5fa' }}>
                            {busy === idea.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button onClick={() => eliminar(idea.id)} disabled={busy === idea.id} title="Eliminar"
                          className="p-1.5 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#ff6b6b' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
