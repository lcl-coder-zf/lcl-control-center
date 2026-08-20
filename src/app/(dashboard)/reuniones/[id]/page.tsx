'use client'

import { useEffect, useState, useCallback, useRef, use } from 'react'
import Link from 'next/link'
import {
  Mic, Square, Upload, Loader2, Sparkles, ArrowLeft, Calendar, Building2,
  Users, Play, CheckSquare, Plus, Wand2, FileText, History,
  ChevronDown, Pencil, Check, ScrollText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  borrador:   { label: 'Borrador',   color: '#6b8fa0', bg: 'rgba(107,143,160,0.12)' },
  procesando: { label: 'Procesando', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  listo:      { label: 'Listo',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  error:      { label: 'Error',      color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)' },
}

// Render mini de markdown (## títulos, - viñetas, **negrita**). El acta de Groq
// viene con ese formato controlado, así evitamos meter una librería.
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: '#1a2e3b' }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>)
}
function ActaView({ md }: { md: string }) {
  return (
    <div className="space-y-1">
      {md.split('\n').map((ln, i) => {
        const h2 = ln.match(/^##\s+(.*)/)
        const h3 = ln.match(/^###\s+(.*)/)
        const li = ln.match(/^[-*]\s+(.*)/)
        if (h2) return <p key={i} className="text-xs font-black uppercase tracking-wide mt-4 first:mt-0 pb-1" style={{ color: '#40b5fa', borderBottom: '1px solid rgba(64,181,250,0.15)' }}>{inline(h2[1])}</p>
        if (h3) return <p key={i} className="text-sm font-bold mt-2" style={{ color: '#1a2e3b' }}>{inline(h3[1])}</p>
        if (li) return <div key={i} className="flex gap-2 text-sm leading-relaxed"><span style={{ color: '#40b5fa' }}>•</span><span style={{ color: '#4a5a6b' }}>{inline(li[1])}</span></div>
        if (!ln.trim()) return null
        return <p key={i} className="text-sm leading-relaxed" style={{ color: '#4a5a6b' }}>{inline(ln)}</p>
      })}
    </div>
  )
}

export default function ReunionDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [meeting, setMeeting] = useState<Row | null>(null)
  const [attendees, setAttendees] = useState<Row[]>([])
  const [seguimiento, setSeguimiento] = useState<Row[]>([])
  const [prev, setPrev] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  // Audio
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Acta + tareas sugeridas + transcripción
  const [actaDraft, setActaDraft] = useState('')
  const [editingActa, setEditingActa] = useState(false)
  const [savingActa, setSavingActa] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [suggested, setSuggested] = useState<{ title: string; assignee: string; due: string }[]>([])

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: m }, { data: pf }] = await Promise.all([
      supabase.from('meetings')
        .select('*, companies(name), meeting_attendees(profiles(id, full_name))')
        .eq('id', id).single(),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ])
    const prof = pf ?? []
    setProfiles(prof)
    setMeeting(m)
    setActaDraft(m?.acta ?? '')
    setAttendees((m?.meeting_attendees ?? []).map((a: Row) => a.profiles).filter(Boolean))
    // Tareas sugeridas persistidas en la reunión (sobreviven al refresh).
    setSuggested((m?.suggested_tasks ?? []).map((it: Row) => ({
      title: it.title,
      assignee: prof.find((p: Row) => p.full_name === it.assignee)?.id ?? '',
      due: '',
    })))

    const { data: tk } = await supabase.from('tasks')
      .select('*, profiles!tasks_assigned_to_fkey(full_name)').eq('meeting_id', id).order('created_at')
    setSeguimiento(tk ?? [])

    if (m?.series) {
      const { data: pv } = await supabase.from('meetings')
        .select('id, title, meeting_date, status').eq('series', m.series).neq('id', id)
        .order('meeting_date', { ascending: false }).limit(5)
      setPrev(pv ?? [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Grabación en el navegador ──────────────────────────────
  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t))
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
        : new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await uploadAudio(blob, 'grabacion.webm')
      }
      mediaRef.current = mr
      mr.start()
      setRecording(true)
    } catch {
      setError('No se pudo acceder al micrófono. Revisa los permisos del navegador.')
    }
  }
  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadAudio(file, file.name)
  }

  async function uploadAudio(blob: Blob, filename: string) {
    setUploading(true); setError(null)
    const supabase = createClient()
    const ext = filename.split('.').pop() || 'webm'
    const path = `${id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('reuniones').upload(path, blob, { upsert: true })
    if (upErr) { setError('Error subiendo el audio: ' + upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('reuniones').getPublicUrl(path)
    await supabase.from('meetings').update({ audio_url: publicUrl, audio_path: path, status: 'borrador' }).eq('id', id)
    setUploading(false)
    await load()
  }

  // ── Transcribir + acta con Groq ────────────────────────────
  async function procesar() {
    setProcessing(true); setError(null)
    try {
      const res = await fetch('/api/meetings/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falló el procesamiento')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando')
    }
    setProcessing(false)
  }

  async function guardarActa() {
    setSavingActa(true)
    const supabase = createClient()
    await supabase.from('meetings').update({ acta: actaDraft }).eq('id', id)
    setSavingActa(false)
    setEditingActa(false)
    await load()
  }

  // ── Crear tarea desde el acta (idea de Laura) ──────────────
  async function crearTarea(item: { title: string; assignee: string; due: string }, idx: number) {
    if (!item.title.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert([{
      title: item.title.trim(),
      assigned_to: item.assignee || user?.id || null,
      due_date: item.due || meeting?.meeting_date || new Date().toISOString().slice(0, 10),
      company_id: meeting?.company_id ?? null,
      meeting_id: id,
      priority: 'media',
      status: 'pendiente',
      task_type: 'esporadica',
      recurrence_active: false,
      created_by: user?.id ?? null,
    }])
    // Persistir la lista restante en la reunión para que no reaparezca al refrescar.
    const restantes = suggested.filter((_, i) => i !== idx)
    setSuggested(restantes)
    await supabase.from('meetings').update({
      suggested_tasks: restantes.map(s => ({
        title: s.title,
        assignee: profiles.find((p: Row) => p.id === s.assignee)?.full_name ?? undefined,
      })),
    }).eq('id', id)
    await load()
  }

  function editSuggested(idx: number, patch: Partial<{ title: string; assignee: string; due: string }>) {
    setSuggested(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  async function toggleSeguimiento(t: Row) {
    const supabase = createClient()
    const done = t.status === 'completada'
    await supabase.from('tasks').update({
      status: done ? 'pendiente' : 'completada',
      completed_at: done ? null : new Date().toISOString(),
    }).eq('id', t.id)
    await load()
  }

  if (loading) return <PageSkeleton />
  if (!meeting) return <div className="p-8 text-sm" style={{ color: '#6b8fa0' }}>Reunión no encontrada.</div>

  const hasAudio = !!meeting.audio_url
  const st = STATUS_CFG[meeting.status] ?? STATUS_CFG.borrador
  const segHechas = seguimiento.filter((t: Row) => t.status === 'completada').length

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <Link href="/reuniones" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: '#6b8fa0' }}>
        <ArrowLeft className="w-4 h-4" />Reuniones
      </Link>

      {/* Header con cinta de color */}
      <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <div style={{ height: 5, background: 'linear-gradient(90deg,#40b5fa,#a78bfa)' }} />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {meeting.series && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(64,181,250,0.1)', color: '#40b5fa' }}>{meeting.series}</span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>{meeting.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm" style={{ color: '#6b8fa0' }}>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(meeting.meeting_date)}</span>
            {meeting.companies?.name && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" />{meeting.companies.name}</span>}
          </div>
          {attendees.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              <Users className="w-3.5 h-3.5" style={{ color: '#86a2b2' }} />
              {attendees.map((a: Row) => (
                <span key={a.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>{a.full_name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(255,107,107,0.1)', color: '#ff6b6b' }}>{error}</div>}

      {/* Audio */}
      <section className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <h2 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: '#1a2e3b' }}>
          <Mic className="w-4 h-4" style={{ color: '#40b5fa' }} />Audio de la reunión
        </h2>
        {hasAudio && <audio controls src={meeting.audio_url} className="w-full mb-4" />}
        <div className="flex flex-wrap items-center gap-2">
          {!recording ? (
            <button onClick={startRecording} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'rgba(255,107,107,0.12)', color: '#ff6b6b' }}>
              <Mic className="w-4 h-4" />Grabar
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold animate-pulse"
              style={{ background: '#ff6b6b', color: '#fff' }}>
              <Square className="w-4 h-4" />Detener
            </button>
          )}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <Upload className="w-4 h-4" />{uploading ? 'Subiendo…' : 'Subir audio'}
            <input type="file" accept="audio/*" onChange={onFile} disabled={uploading} className="hidden" />
          </label>
          {hasAudio && (
            <button onClick={procesar} disabled={processing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ml-auto disabled:opacity-60"
              style={{ background: '#40b5fa', color: '#fff' }}>
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando…</> : <><Sparkles className="w-4 h-4" />{meeting.transcript ? 'Regenerar acta' : 'Transcribir y generar acta'}</>}
            </button>
          )}
        </div>
        {uploading && <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#6b8fa0' }}><Loader2 className="w-3 h-3 animate-spin" />Subiendo audio…</p>}
      </section>

      {/* Resumen destacado */}
      {meeting.summary && (
        <section className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(180deg,rgba(64,181,250,0.06),rgba(167,139,250,0.05))', border: '1px solid rgba(64,181,250,0.18)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: '#40b5fa' }}>
            <Sparkles className="w-4 h-4" />Resumen
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#3a4a5b' }}>{meeting.summary}</p>
        </section>
      )}

      {/* Tareas sugeridas por la IA */}
      {suggested.length > 0 && (
        <section className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.22)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-1 flex items-center gap-2" style={{ color: '#8b5cf6' }}>
            <Wand2 className="w-4 h-4" />Tareas sugeridas del acta ({suggested.length})
          </h2>
          <p className="text-[11px] mb-4" style={{ color: '#86a2b2' }}>Ajusta responsable y fecha, y créalas como seguimiento.</p>
          <div className="space-y-2">
            {suggested.map((it, idx) => (
              <div key={idx} className="rounded-xl p-3 space-y-2" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.06)' }}>
                <input value={it.title} onChange={e => editSuggested(idx, { title: e.target.value })}
                  className="w-full text-sm outline-none rounded-lg px-3 py-2" style={{ background: '#f4f7fa', color: '#1a2e3b' }} />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={it.assignee} onChange={e => editSuggested(idx, { assignee: e.target.value })}
                    className="text-xs outline-none rounded-lg px-2 py-1.5" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
                    <option value="">Responsable…</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                  <input type="date" value={it.due} onChange={e => editSuggested(idx, { due: e.target.value })}
                    className="text-xs outline-none rounded-lg px-2 py-1.5" style={{ background: '#f4f7fa', color: '#6b8fa0' }} />
                  <button onClick={() => crearTarea(it, idx)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg ml-auto" style={{ background: '#8b5cf6', color: '#fff' }}>
                    <Plus className="w-3 h-3" />Crear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Acta */}
      <section className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#1a2e3b' }}>
            <FileText className="w-4 h-4" style={{ color: '#40b5fa' }} />Acta
          </h2>
          {editingActa || !actaDraft.trim() ? (
            <button onClick={guardarActa} disabled={savingActa}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#40b5fa', color: '#fff' }}>
              {savingActa ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Guardar
            </button>
          ) : (
            <button onClick={() => setEditingActa(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#f4f7fa', color: '#40b5fa' }}>
              <Pencil className="w-3 h-3" />Editar
            </button>
          )}
        </div>
        {editingActa || !actaDraft.trim() ? (
          <textarea value={actaDraft} onChange={e => setActaDraft(e.target.value)} autoFocus={editingActa}
            placeholder="El acta se genera automáticamente al transcribir, o escríbela a mano aquí (markdown)…"
            className="w-full text-sm outline-none rounded-xl px-3.5 py-3 leading-relaxed resize-y"
            style={{ background: '#f9fbfc', color: '#1a2e3b', minHeight: 240, border: '1px solid rgba(0,40,80,0.06)' }} />
        ) : (
          <div className="rounded-xl px-4 py-3" style={{ background: '#f9fbfc', border: '1px solid rgba(0,40,80,0.06)' }}>
            <ActaView md={actaDraft} />
          </div>
        )}
      </section>

      {/* Transcripción (colapsable) */}
      {meeting.transcript && (
        <section className="rounded-2xl mb-5 overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <button onClick={() => setShowTranscript(v => !v)} className="w-full flex items-center justify-between p-5">
            <span className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#1a2e3b' }}>
              <ScrollText className="w-4 h-4" style={{ color: '#40b5fa' }} />Transcripción
              <span className="text-[11px] font-medium normal-case tracking-normal" style={{ color: '#86a2b2' }}>· {meeting.transcript.length.toLocaleString('es-CO')} caracteres</span>
            </span>
            <ChevronDown className="w-4 h-4 transition-transform" style={{ color: '#86a2b2', transform: showTranscript ? 'rotate(180deg)' : 'none' }} />
          </button>
          {showTranscript && (
            <div className="px-5 pb-5">
              <div className="rounded-xl px-4 py-3 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: '#f9fbfc', color: '#4a5a6b', maxHeight: 380, border: '1px solid rgba(0,40,80,0.06)' }}>
                {meeting.transcript}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Seguimiento (tareas de la reunión) */}
      <section className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <h2 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: '#1a2e3b' }}>
          <CheckSquare className="w-4 h-4" style={{ color: '#40b5fa' }} />Seguimiento
          {seguimiento.length > 0 && <span className="text-[11px] font-medium normal-case tracking-normal" style={{ color: '#86a2b2' }}>· {segHechas}/{seguimiento.length}</span>}
        </h2>
        {seguimiento.length === 0 ? (
          <p className="text-sm" style={{ color: '#86a2b2' }}>
            {suggested.length > 0 ? 'Crea tareas desde las sugerencias de arriba.' : 'Aún no hay tareas de esta reunión.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {seguimiento.map((t: Row) => {
              const done = t.status === 'completada'
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: '#f9fbfc', border: '1px solid rgba(0,40,80,0.05)' }}>
                  <button onClick={() => toggleSeguimiento(t)}
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: done ? 'rgba(34,197,94,0.18)' : '#fff', border: `1.5px solid ${done ? '#22c55e' : 'rgba(0,40,80,0.15)'}` }}>
                    {done && <Check className="w-3 h-3" style={{ color: '#22c55e' }} />}
                  </button>
                  <span className="flex-1 text-sm truncate" style={{ color: '#1a2e3b', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1 }}>{t.title}</span>
                  {t.profiles?.full_name && <span className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#eef3f7', color: '#6b8fa0' }}>{t.profiles.full_name}</span>}
                  {t.due_date && <span className="text-[11px] flex-shrink-0" style={{ color: '#86a2b2' }}>{formatDate(t.due_date)}</span>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Reuniones anteriores de la serie */}
      {prev.length > 0 && (
        <section className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: '#1a2e3b' }}>
            <History className="w-4 h-4" style={{ color: '#40b5fa' }} />Reuniones anteriores de la serie
          </h2>
          <div className="space-y-1.5">
            {prev.map((p: Row) => (
              <Link key={p.id} href={`/reuniones/${p.id}`}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-[#f4f7fa] transition-colors" style={{ background: '#f9fbfc' }}>
                <Play className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#40b5fa' }} />
                <span className="flex-1 text-sm truncate" style={{ color: '#1a2e3b' }}>{p.title}</span>
                <span className="text-[11px]" style={{ color: '#86a2b2' }}>{formatDate(p.meeting_date)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
