'use client'

import { useEffect, useState, useCallback, useRef, use } from 'react'
import Link from 'next/link'
import {
  Mic, Square, Upload, Loader2, Sparkles, ArrowLeft, Calendar, Building2,
  Users, Play, CheckSquare, Plus, Wand2, FileText, History,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

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

  // Acta + tareas sugeridas
  const [actaDraft, setActaDraft] = useState('')
  const [savingActa, setSavingActa] = useState(false)
  const [suggested, setSuggested] = useState<{ title: string; assignee: string; due: string }[]>([])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: m } = await supabase.from('meetings')
      .select('*, companies(name), meeting_attendees(profiles(id, full_name))')
      .eq('id', id).single()
    setMeeting(m)
    setActaDraft(m?.acta ?? '')
    setAttendees((m?.meeting_attendees ?? []).map((a: Row) => a.profiles).filter(Boolean))

    const [tk, pf] = await Promise.all([
      supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(full_name)').eq('meeting_id', id).order('created_at'),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ])
    setSeguimiento(tk.data ?? [])
    setProfiles(pf.data ?? [])

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
      // Mono + supresión de ruido: mejor para voz y archivos más livianos.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      // Bitrate bajo (32 kbps): Whisper solo necesita voz, y así 1h de reunión
      // pesa ~14 MB en vez de 40+ MB (evita el 413 de Groq por tamaño).
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
      setActaDraft(data.acta ?? '')
      setSuggested((data.actionItems ?? []).map((it: { title: string; assignee?: string }) => ({
        title: it.title,
        assignee: profiles.find(p => p.full_name === it.assignee)?.id ?? '',
        due: '',
      })))
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
    setSuggested(prev => prev.filter((_, i) => i !== idx))
    await load()
  }

  function editSuggested(idx: number, patch: Partial<{ title: string; assignee: string; due: string }>) {
    setSuggested(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  if (loading) return <PageSkeleton />
  if (!meeting) return <div className="p-8 text-sm" style={{ color: '#6b8fa0' }}>Reunión no encontrada.</div>

  const hasAudio = !!meeting.audio_url

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <Link href="/reuniones" className="inline-flex items-center gap-1.5 text-sm mb-5" style={{ color: '#6b8fa0' }}>
        <ArrowLeft className="w-4 h-4" />Reuniones
      </Link>

      {/* Header */}
      <div className="mb-6">
        {meeting.series && <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>{meeting.series}</p>}
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>{meeting.title}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: '#6b8fa0' }}>
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(meeting.meeting_date)}</span>
          {meeting.companies?.name && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" />{meeting.companies.name}</span>}
          {attendees.length > 0 && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{attendees.map((a: Row) => a.full_name).join(', ')}</span>}
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
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando…</> : <><Sparkles className="w-4 h-4" />Transcribir y generar acta</>}
            </button>
          )}
        </div>
        {uploading && <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#6b8fa0' }}><Loader2 className="w-3 h-3 animate-spin" />Subiendo audio…</p>}
      </section>

      {/* Tareas sugeridas por la IA */}
      {suggested.length > 0 && (
        <section className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(64,181,250,0.05)', border: '1px solid rgba(64,181,250,0.2)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: '#40b5fa' }}>
            <Wand2 className="w-4 h-4" />Tareas sugeridas del acta
          </h2>
          <div className="space-y-2">
            {suggested.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded-xl p-2.5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.06)' }}>
                <input value={it.title} onChange={e => editSuggested(idx, { title: e.target.value })}
                  className="flex-1 min-w-[160px] text-sm outline-none rounded-lg px-2.5 py-1.5" style={{ background: '#f4f7fa', color: '#1a2e3b' }} />
                <select value={it.assignee} onChange={e => editSuggested(idx, { assignee: e.target.value })}
                  className="text-xs outline-none rounded-lg px-2 py-1.5" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
                  <option value="">Responsable…</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                <input type="date" value={it.due} onChange={e => editSuggested(idx, { due: e.target.value })}
                  className="text-xs outline-none rounded-lg px-2 py-1.5" style={{ background: '#f4f7fa', color: '#6b8fa0' }} />
                <button onClick={() => crearTarea(it, idx)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#40b5fa', color: '#fff' }}>
                  <Plus className="w-3 h-3" />Crear
                </button>
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
          <button onClick={guardarActa} disabled={savingActa}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#f4f7fa', color: '#40b5fa' }}>
            {savingActa ? 'Guardando…' : 'Guardar acta'}
          </button>
        </div>
        {meeting.summary && (
          <div className="rounded-xl px-3.5 py-3 mb-3 text-sm" style={{ background: 'rgba(74,222,128,0.08)', color: '#1a2e3b' }}>
            <span className="font-semibold" style={{ color: '#4ade80' }}>Resumen: </span>{meeting.summary}
          </div>
        )}
        <textarea value={actaDraft} onChange={e => setActaDraft(e.target.value)}
          placeholder="El acta se genera automáticamente al transcribir, o escríbela a mano aquí (markdown)…"
          className="w-full text-sm outline-none rounded-xl px-3.5 py-3 leading-relaxed resize-y"
          style={{ background: '#f9fbfc', color: '#1a2e3b', minHeight: 220, border: '1px solid rgba(0,40,80,0.06)' }} />
      </section>

      {/* Seguimiento (tareas de la reunión) */}
      <section className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <h2 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: '#1a2e3b' }}>
          <CheckSquare className="w-4 h-4" style={{ color: '#40b5fa' }} />Seguimiento ({seguimiento.length})
        </h2>
        {seguimiento.length === 0 ? (
          <p className="text-sm" style={{ color: '#86a2b2' }}>Aún no hay tareas de esta reunión. Crea unas desde el acta.</p>
        ) : (
          <div className="space-y-1.5">
            {seguimiento.map((t: Row) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: '#f9fbfc', border: '1px solid rgba(0,40,80,0.05)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.status === 'completada' ? '#4ade80' : '#fb923c' }} />
                <span className="flex-1 text-sm truncate" style={{ color: '#1a2e3b', textDecoration: t.status === 'completada' ? 'line-through' : 'none', opacity: t.status === 'completada' ? 0.5 : 1 }}>{t.title}</span>
                {t.profiles?.full_name && <span className="text-[11px]" style={{ color: '#86a2b2' }}>{t.profiles.full_name}</span>}
                {t.due_date && <span className="text-[11px]" style={{ color: '#86a2b2' }}>{formatDate(t.due_date)}</span>}
              </div>
            ))}
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
