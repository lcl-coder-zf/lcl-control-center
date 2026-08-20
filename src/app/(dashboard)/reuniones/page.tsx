'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mic, Plus, X, Loader2, ArrowUpRight, Building2, Calendar, FileText, Clock, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  borrador:   { label: 'Borrador',   color: '#6b8fa0', bg: 'rgba(107,143,160,0.12)', dot: '#b0bcc7' },
  procesando: { label: 'Procesando', color: '#b7791f', bg: 'rgba(251,146,60,0.14)',  dot: '#fb923c' },
  listo:      { label: 'Con acta',   color: '#0f9d58', bg: 'rgba(34,197,94,0.14)',   dot: '#22c55e' },
  error:      { label: 'Error',      color: '#dc2626', bg: 'rgba(255,107,107,0.14)',  dot: '#ff6b6b' },
}

export default function ReunionesPage() {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Row[]>([])
  const [companies, setCompanies] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const [m, p, c] = await Promise.all([
      supabase.from('meetings').select('*, companies(name)').order('meeting_date', { ascending: false }),
      supabase.from('profiles').select('id, full_name').order('full_name'),
      supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
    ])
    setMeetings(m.data ?? [])
    setProfiles(p.data ?? [])
    setCompanies(c.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!q.trim()) return meetings
    const s = q.toLowerCase()
    return meetings.filter((m: Row) =>
      m.title?.toLowerCase().includes(s) || m.series?.toLowerCase().includes(s) || m.companies?.name?.toLowerCase().includes(s))
  }, [meetings, q])

  const conActa = meetings.filter((m: Row) => m.status === 'listo').length

  if (loading) return <PageSkeleton />

  // Agrupar por serie (las sin serie van sueltas al final).
  const series = new Map<string, Row[]>()
  const sueltas: Row[] = []
  for (const mt of filtered) {
    if (mt.series) {
      if (!series.has(mt.series)) series.set(mt.series, [])
      series.get(mt.series)!.push(mt)
    } else sueltas.push(mt)
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl mb-7 p-6 lg:p-8"
        style={{ background: 'linear-gradient(135deg, #101a2e 0%, #1a2e4d 55%, #263c66 100%)' }}>
        {/* halos decorativos */}
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(64,181,250,0.35)' }} />
        <div className="pointer-events-none absolute -bottom-24 left-12 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(167,139,250,0.28)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                <Mic className="w-4.5 h-4.5" style={{ color: '#8fd0ff' }} />
              </span>
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: '#8fd0ff' }}>Módulo · Actas con IA</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>Reuniones</h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Graba o sube el audio · la IA saca el acta, el resumen y el seguimiento.</p>
            <div className="flex items-center gap-5 mt-5">
              <Stat n={meetings.length} label="Reuniones" />
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.14)' }} />
              <Stat n={conActa} label="Con acta" accent="#8fd0ff" />
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.14)' }} />
              <Stat n={series.size} label="Series" accent="#c4b5fd" />
            </div>
          </div>
          <button onClick={() => setShowNew(true)}
            className="group flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95 self-start"
            style={{ background: '#fff', color: '#101a2e', boxShadow: '0 10px 30px -8px rgba(64,181,250,0.5)' }}>
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />Nueva reunión
          </button>
        </div>
      </div>

      {/* buscador */}
      {meetings.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 mb-6" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: '#86a2b2' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por título, serie o cliente…"
            className="flex-1 text-sm outline-none bg-transparent" style={{ color: '#1a2e3b' }} />
          {q && <button onClick={() => setQ('')}><X className="w-4 h-4" style={{ color: '#b0bcc7' }} /></button>}
        </div>
      )}

      {meetings.length === 0 ? (
        <div className="rounded-3xl flex flex-col items-center justify-center py-24"
          style={{ background: 'linear-gradient(180deg,#fbfcfe,#f4f7fa)', border: '1px dashed rgba(0,40,80,0.12)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#40b5fa,#a78bfa)' }}>
            <Mic className="w-7 h-7 text-white" />
          </div>
          <p className="font-bold text-lg" style={{ color: '#1a2e3b' }}>Aún no hay reuniones</p>
          <p className="text-sm mt-1" style={{ color: '#86a2b2' }}>Crea la primera y sube o graba el audio</p>
          <button onClick={() => setShowNew(true)} className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#40b5fa,#a78bfa)' }}>
            <Plus className="w-4 h-4" />Nueva reunión
          </button>
        </div>
      ) : (
        <div className="space-y-9">
          {[...series.entries()].map(([serie, list]) => (
            <div key={serie}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg,#40b5fa,#a78bfa)' }} />
                <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: '#1a2e3b' }}>{serie}</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(64,181,250,0.1)', color: '#40b5fa' }}>{list.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">{list.map((mt, i) => <MeetingCard key={mt.id} mt={mt} i={i} />)}</div>
            </div>
          ))}
          {sueltas.length > 0 && (
            <div>
              {series.size > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-[3px] rounded-full" style={{ background: '#d5ddec' }} />
                  <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: '#6b8fa0' }}>Otras reuniones</h2>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">{sueltas.map((mt, i) => <MeetingCard key={mt.id} mt={mt} i={i} />)}</div>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <NuevaReunionModal
          profiles={profiles}
          companies={companies}
          seriesExistentes={[...new Set(meetings.map((m: Row) => m.series).filter(Boolean))] as string[]}
          onClose={() => setShowNew(false)}
          onCreated={(id) => router.push(`/reuniones/${id}`)}
        />
      )}
    </div>
  )
}

function Stat({ n, label, accent = '#fff' }: { n: number; label: string; accent?: string }) {
  return (
    <div>
      <div className="text-2xl font-black leading-none" style={{ color: accent }}>{n}</div>
      <div className="text-[11px] mt-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</div>
    </div>
  )
}

function MeetingCard({ mt, i }: { mt: Row; i: number }) {
  const st = STATUS[mt.status] ?? STATUS.borrador
  return (
    <Link href={`/reuniones/${mt.id}`}
      className="group relative overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)', boxShadow: '0 1px 2px rgba(0,40,80,0.03)', animation: `fadeUp .4s ease both`, animationDelay: `${i * 40}ms` }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 16px 40px -14px rgba(64,181,250,0.35)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,40,80,0.03)')}>
      {/* cinta superior */}
      <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(90deg,#40b5fa,#a78bfa)' }} />
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(64,181,250,0.15), rgba(167,139,250,0.15))' }}>
          <Mic className="w-5 h-5" style={{ color: '#40b5fa' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-bold leading-snug" style={{ color: '#1a2e3b' }}>{mt.title}</p>
            <ArrowUpRight className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" style={{ color: '#40b5fa' }} />
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: '#86a2b2' }}><Calendar className="w-3 h-3" />{formatDate(mt.meeting_date)}</span>
            {mt.companies?.name && <span className="inline-flex items-center gap-1 text-[11px] font-medium truncate" style={{ color: '#86a2b2' }}><Building2 className="w-3 h-3" />{mt.companies.name}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,40,80,0.05)' }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />{st.label}
        </span>
        {mt.transcript && <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: '#a0aec0' }}><FileText className="w-3 h-3" />transcrito</span>}
      </div>
    </Link>
  )
}

function NuevaReunionModal({ profiles, companies, seriesExistentes, onClose, onCreated }: {
  profiles: Row[]; companies: Row[]; seriesExistentes: string[]
  onClose: () => void; onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [serie, setSerie] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [attendees, setAttendees] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setAttendees(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function crear() {
    if (!title.trim() || saving) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('meetings').insert([{
      title: title.trim(),
      meeting_date: date,
      series: serie.trim() || null,
      company_id: companyId || null,
      status: 'borrador',
      created_by: user?.id ?? null,
    }]).select('id').single()
    if (error || !data) { setSaving(false); return }
    if (attendees.size > 0) {
      await supabase.from('meeting_attendees').insert([...attendees].map(pid => ({ meeting_id: data.id, profile_id: pid })))
    }
    onCreated(data.id)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#0a1220]/40 backdrop-blur-[3px] animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: 'popIn .25s cubic-bezier(.2,.8,.2,1) both' }}>
          {/* header con degradado */}
          <div className="relative px-6 pt-6 pb-5" style={{ background: 'linear-gradient(135deg,#101a2e,#263c66)' }}>
            <div className="pointer-events-none absolute -top-8 -right-6 w-40 h-40 rounded-full blur-2xl" style={{ background: 'rgba(64,181,250,0.4)' }} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)' }}><Mic className="w-4.5 h-4.5" style={{ color: '#8fd0ff' }} /></span>
                <h2 className="text-lg font-black text-white">Nueva reunión</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <Field label="Título *">
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Reunión de Comité LCL"
                className="w-full text-sm outline-none rounded-xl px-3 py-2.5 focus:ring-2 transition-all" style={{ background: '#f4f7fa', color: '#1a2e3b' }} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full text-sm outline-none rounded-xl px-3 py-2.5" style={{ background: '#f4f7fa', color: '#1a2e3b' }} />
              </Field>
              <Field label="Serie (opcional)">
                <input list="series-list" value={serie} onChange={e => setSerie(e.target.value)} placeholder="Reunión Equipo LCL"
                  className="w-full text-sm outline-none rounded-xl px-3 py-2.5" style={{ background: '#f4f7fa', color: '#1a2e3b' }} />
                <datalist id="series-list">{seriesExistentes.map(s => <option key={s} value={s} />)}</datalist>
              </Field>
            </div>
            <Field label="Cliente (opcional)">
              <select value={companyId} onChange={e => setCompanyId(e.target.value)}
                className="w-full text-sm outline-none rounded-xl px-3 py-2.5" style={{ background: '#f4f7fa', color: '#1a2e3b' }}>
                <option value="">— Ninguno —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Asistentes">
              <div className="flex flex-wrap gap-1.5">
                {profiles.map(p => {
                  const on = attendees.has(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => toggle(p.id)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: on ? 'rgba(64,181,250,0.15)' : '#f4f7fa', color: on ? '#40b5fa' : '#6b8fa0', border: `1px solid ${on ? 'rgba(64,181,250,0.3)' : 'transparent'}` }}>
                      {p.full_name}
                    </button>
                  )
                })}
              </div>
            </Field>
            <button onClick={crear} disabled={!title.trim() || saving}
              className="w-full mt-2 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:brightness-105"
              style={{ background: 'linear-gradient(135deg,#40b5fa,#a78bfa)', color: '#fff' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-4 h-4" />Crear y abrir</>}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes popIn { from { opacity: 0; transform: scale(.96) translateY(8px) } to { opacity: 1; transform: none } }
      `}</style>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      {children}
    </div>
  )
}
