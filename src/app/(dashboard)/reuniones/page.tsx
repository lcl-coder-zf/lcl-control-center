'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mic, Plus, X, Loader2, ChevronRight, Building2, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  borrador:   { label: 'Borrador',   color: '#6b8fa0', bg: 'rgba(107,143,160,0.12)' },
  procesando: { label: 'Procesando', color: '#fb923c', bg: 'rgba(251,146,60,0.14)' },
  listo:      { label: 'Con acta',   color: '#4ade80', bg: 'rgba(74,222,128,0.14)' },
  error:      { label: 'Error',      color: '#ff6b6b', bg: 'rgba(255,107,107,0.14)' },
}

export default function ReunionesPage() {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Row[]>([])
  const [companies, setCompanies] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

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

  if (loading) return <PageSkeleton />

  // Agrupar por serie (las sin serie van sueltas al final).
  const series = new Map<string, Row[]>()
  const sueltas: Row[] = []
  for (const mt of meetings) {
    if (mt.series) {
      if (!series.has(mt.series)) series.set(mt.series, [])
      series.get(mt.series)!.push(mt)
    } else sueltas.push(mt)
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo</p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Reuniones</h1>
          <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>
            {meetings.length} reuni{meetings.length === 1 ? 'ón' : 'ones'} · audio, acta y seguimiento
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#40b5fa', color: '#fff' }}>
          <Plus className="w-4 h-4" />Nueva reunión
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <Mic className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Aún no hay reuniones</p>
          <p className="text-sm mt-1" style={{ color: '#86a2b2' }}>Crea la primera y sube o graba el audio</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...series.entries()].map(([serie, list]) => (
            <div key={serie}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#40b5fa' }} />
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#1a2e3b' }}>{serie}</h2>
                <span className="text-xs" style={{ color: '#86a2b2' }}>{list.length}</span>
              </div>
              <div className="space-y-2">{list.map(mt => <MeetingRow key={mt.id} mt={mt} />)}</div>
            </div>
          ))}
          {sueltas.length > 0 && (
            <div>
              {series.size > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#b0bcc7' }} />
                  <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#6b8fa0' }}>Otras reuniones</h2>
                </div>
              )}
              <div className="space-y-2">{sueltas.map(mt => <MeetingRow key={mt.id} mt={mt} />)}</div>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <NuevaReunionModal
          profiles={profiles}
          companies={companies}
          seriesExistentes={[...series.keys()]}
          onClose={() => setShowNew(false)}
          onCreated={(id) => router.push(`/reuniones/${id}`)}
        />
      )}
    </div>
  )
}

function MeetingRow({ mt }: { mt: Row }) {
  const st = STATUS[mt.status] ?? STATUS.borrador
  return (
    <Link href={`/reuniones/${mt.id}`}
      className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all hover:shadow-md group"
      style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(64,181,250,0.12)' }}>
        <Mic className="w-4 h-4" style={{ color: '#40b5fa' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{mt.title}</p>
        <div className="flex items-center gap-3 mt-0.5 text-[11px]" style={{ color: '#86a2b2' }}>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(mt.meeting_date)}</span>
          {mt.companies?.name && <span className="flex items-center gap-1 truncate"><Building2 className="w-3 h-3" />{mt.companies.name}</span>}
        </div>
      </div>
      <span className="text-[10px] font-semibold px-2 py-1 rounded-lg flex-shrink-0" style={{ color: st.color, background: st.bg }}>{st.label}</span>
      <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: '#6b8fa0' }} />
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
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black" style={{ color: '#1a2e3b' }}>Nueva reunión</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f4f7fa]" style={{ color: '#6b8fa0' }}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            <Field label="Título *">
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Reunión de Comité LCL"
                className="w-full text-sm outline-none rounded-xl px-3 py-2.5" style={{ background: '#f4f7fa', color: '#1a2e3b' }} />
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
          </div>
          <button onClick={crear} disabled={!title.trim() || saving}
            className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#40b5fa', color: '#fff' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear y abrir'}
          </button>
        </div>
      </div>
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
