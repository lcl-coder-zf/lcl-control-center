'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, formatDate } from '@/lib/utils'
import { RECURRENCE_CONFIG, RECURRENCE_OPTIONS, nextDueDate, type Recurrence } from '@/lib/tasks'
import { notify, adminIds } from '@/lib/notify'
import { PageSkeleton } from '@/components/ui/Skeleton'
import {
  CalendarDays, Gauge, Plus, X, Loader2, Circle, Trash2, RefreshCw,
  Clock, CheckCircle2, ChevronLeft, ChevronRight, Users, Building2,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

// Color por tipo de evento.
function typeStyle(type: string) {
  if (type === 'auditoria') return { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Auditoría' }
  if (type === 'reunion')   return { color: '#40b5fa', bg: 'rgba(64,181,250,0.12)', label: 'Reunión' }
  return { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: type }
}

export default function AgendaPage() {
  const [tab, setTab] = useState<'eventos' | 'indicadores'>('eventos')
  const [events, setEvents] = useState<Row[]>([])
  const [indicators, setIndicators] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Row[]>([])
  const [companies, setCompanies] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [e, i, p, c] = await Promise.all([
      supabase.from('events').select('*, companies(name), event_attendees(profiles(id, full_name))').order('event_date', { ascending: true }),
      supabase.from('indicators').select('*, companies(id, name), profiles(id, full_name)').order('due_date', { ascending: true }),
      supabase.from('profiles').select('id, full_name').order('full_name'),
      supabase.from('companies').select('id, name').order('name'),
    ])
    setEvents(e.data ?? [])
    setIndicators(i.data ?? [])
    setProfiles(p.data ?? [])
    setCompanies(c.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 04</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Agenda</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>Eventos del equipo e indicadores por responsable</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { id: 'eventos',     icon: CalendarDays, label: `Eventos (${events.length})` },
          { id: 'indicadores', icon: Gauge,        label: `Indicadores (${indicators.length})` },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: tab === id ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
              color: tab === id ? '#40b5fa' : '#6b8fa0',
              border: `1px solid ${tab === id ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'eventos'
        ? <Eventos events={events} profiles={profiles} companies={companies} reload={load} />
        : <Indicadores indicators={indicators} profiles={profiles} companies={companies} reload={load} />}
    </div>
  )
}

// ── EVENTOS (calendario + invitados) ──────────────────────────────────────────
function Eventos({ events, profiles, companies, reload }: { events: Row[]; profiles: Row[]; companies: Row[]; reload: () => void }) {
  const today = new Date()
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState<string>(dateKey(today.getFullYear(), today.getMonth(), today.getDate()))
  const [showNew, setShowNew] = useState(false)
  const [detail, setDetail] = useState<Row | null>(null)

  // Grid del mes (semana inicia lunes).
  const first = new Date(cursor.y, cursor.m, 1)
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const eventsOn = (key: string) => events.filter(e => e.event_date === key)
  const selectedEvents = eventsOn(selected)

  function move(delta: number) {
    setCursor(c => {
      const d = new Date(c.y, c.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  async function del(id: string) {
    const supabase = createClient()
    await supabase.from('events').delete().eq('id', id)
    reload()
  }
  async function toggle(ev: Row) {
    const supabase = createClient()
    await supabase.from('events').update({ status: ev.status === 'hecho' ? 'programado' : 'hecho' }).eq('id', ev.id)
    reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="p-2 rounded-xl" style={{ background: '#f4f7fa', color: '#6b8fa0' }}><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="text-lg font-black w-44 text-center" style={{ color: '#1a2e3b' }}>{MONTHS[cursor.m]} {cursor.y}</h2>
          <button onClick={() => move(1)} className="p-2 rounded-xl" style={{ background: '#f4f7fa', color: '#6b8fa0' }}><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#40b5fa', color: '#fff' }}>
          <Plus className="w-4 h-4" />Nuevo evento
        </button>
      </div>

      {/* Calendario */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] uppercase tracking-wider font-semibold py-1" style={{ color: '#86a2b2' }}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} />
            const key = dateKey(cursor.y, cursor.m, day)
            const dayEvents = eventsOn(key)
            const isToday = key === dateKey(today.getFullYear(), today.getMonth(), today.getDate())
            const isSel = key === selected
            return (
              <button key={idx} onClick={() => setSelected(key)}
                className="min-h-[64px] rounded-xl p-1.5 text-left transition-all flex flex-col gap-0.5"
                style={{
                  background: isSel ? 'rgba(64,181,250,0.10)' : '#fafbfc',
                  border: `1px solid ${isSel ? 'rgba(64,181,250,0.4)' : 'rgba(0,40,80,0.05)'}`,
                }}>
                <span className="text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full"
                  style={{ background: isToday ? '#40b5fa' : 'transparent', color: isToday ? '#fff' : '#1a2e3b' }}>{day}</span>
                {dayEvents.slice(0, 2).map(e => {
                  const ts = typeStyle(e.event_type)
                  return (
                    <span key={e.id} onClick={(ev) => { ev.stopPropagation(); setDetail(e) }}
                      className="text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ background: ts.bg, color: ts.color }}>{e.title}</span>
                  )
                })}
                {dayEvents.length > 2 && <span className="text-[9px]" style={{ color: '#86a2b2' }}>+{dayEvents.length - 2}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Panel del día seleccionado */}
      <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: '#1a2e3b' }}>{formatDate(selected)}</h3>
          <button onClick={() => setShowNew(true)} className="text-xs font-semibold flex items-center gap-1" style={{ color: '#40b5fa' }}>
            <Plus className="w-3 h-3" />Agregar
          </button>
        </div>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: '#6b8fa0' }}>Sin eventos este día</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map(ev => {
              const ts = typeStyle(ev.event_type)
              const done = ev.status === 'hecho'
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const attendees = (ev.event_attendees ?? []).map((a: any) => a.profiles?.full_name).filter(Boolean)
              return (
                <div key={ev.id} className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.06)', opacity: done ? 0.65 : 1 }}>
                  <button onClick={() => toggle(ev)} className="flex-shrink-0 mt-0.5" title={done ? 'Marcar programado' : 'Marcar hecho'}>
                    {done ? <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} /> : <Circle className="w-5 h-5" style={{ color: '#86a2b2' }} />}
                  </button>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetail(ev)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium hover:underline" style={{ color: '#1a2e3b', textDecoration: done ? 'line-through' : 'none' }}>{ev.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
                      {ev.event_time && <span className="text-[11px] flex items-center gap-1" style={{ color: '#6b8fa0' }}><Clock className="w-3 h-3" />{ev.event_time.slice(0, 5)}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-1">
                      {ev.companies?.name && <span className="text-[11px] flex items-center gap-1" style={{ color: '#6b8fa0' }}><Building2 className="w-3 h-3" />{ev.companies.name}</span>}
                      {attendees.length > 0 && (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: '#a78bfa' }}>
                          <Users className="w-3 h-3" />{attendees.join(', ')}
                        </span>
                      )}
                    </div>
                    {ev.notas && <p className="text-[11px] mt-1" style={{ color: '#86a2b2' }}>{ev.notas}</p>}
                  </div>
                  <button onClick={() => del(ev.id)} className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: '#ff6b6b' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {detail && (
        <EventoDetalle ev={detail} onClose={() => setDetail(null)}
          onToggle={async () => { await toggle(detail); setDetail(null) }}
          onDelete={async () => { if (confirm('¿Eliminar este evento?')) { await del(detail.id); setDetail(null) } }} />
      )}

      {showNew && (
        <NuevoEvento defaultDate={selected} profiles={profiles} companies={companies}
          onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); reload() }} />
      )}
    </div>
  )
}

// Detalle de un evento (al hacer clic).
function EventoDetalle({ ev, onClose, onToggle, onDelete }: { ev: Row; onClose: () => void; onToggle: () => void; onDelete: () => void }) {
  const ts = typeStyle(ev.event_type)
  const done = ev.status === 'hecho'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attendees = (ev.event_attendees ?? []).map((a: any) => a.profiles?.full_name).filter(Boolean)
  const fecha = new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b" style={{ borderColor: '#e2e8f5' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
            {done && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>Hecho</span>}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa]"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-3">
          <h2 className="text-lg font-black" style={{ color: '#1a2e3b' }}>{ev.title}</h2>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#4a5a6b' }}>
            <CalendarDays className="w-4 h-4" style={{ color: '#40b5fa' }} />
            <span className="capitalize">{fecha}</span>
            {ev.event_time && <><Clock className="w-4 h-4 ml-2" style={{ color: '#40b5fa' }} />{ev.event_time.slice(0, 5)}</>}
          </div>
          {ev.companies?.name && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#4a5a6b' }}>
              <Building2 className="w-4 h-4" style={{ color: '#40b5fa' }} />{ev.companies.name}
            </div>
          )}
          {attendees.length > 0 && (
            <div className="flex items-start gap-2 text-sm" style={{ color: '#4a5a6b' }}>
              <Users className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
              <span>{attendees.join(', ')}</span>
            </div>
          )}
          {ev.notas && (
            <div className="rounded-xl p-3 text-sm" style={{ background: '#f4f7fa', color: '#4a5a6b' }}>{ev.notas}</div>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onDelete} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5" style={{ background: 'rgba(255,107,107,0.10)', color: '#ff6b6b' }}>
            <Trash2 className="w-4 h-4" />Eliminar
          </button>
          <button onClick={onToggle} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: done ? '#86a2b2' : '#4ade80' }}>
            {done ? 'Marcar programado' : 'Marcar como hecho'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NuevoEvento({ defaultDate, profiles, companies, onClose, onSaved }: {
  defaultDate: string; profiles: Row[]; companies: Row[]; onClose: () => void; onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [typeChoice, setTypeChoice] = useState<'auditoria' | 'reunion' | 'otro'>('reunion')
  const [customType, setCustomType] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [notas, setNotas] = useState('')
  const [invitees, setInvitees] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  function toggleInvitee(id: string) {
    setInvitees(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function save() {
    if (!title.trim() || !date) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const event_type = typeChoice === 'otro' ? (customType.trim() || 'Otro') : typeChoice
    const { data: ev, error } = await supabase.from('events').insert([{
      title, event_type, company_id: companyId || null, organizer_id: user?.id ?? null,
      event_date: date, event_time: time || null, status: 'programado', notas: notas || null,
    }]).select().single()
    if (error) { setSaving(false); alert('No se pudo crear el evento: ' + error.message); return }
    if (ev && invitees.size > 0) {
      await supabase.from('event_attendees').insert([...invitees].map(pid => ({ event_id: ev.id, profile_id: pid })))
    }
    // Notificar a invitados + admins (Laura y Daniel reciben todo).
    const admins = await adminIds(supabase)
    const fecha = new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    await notify(supabase, {
      recipientIds: [...invitees, ...admins],
      type: 'evento_invitado',
      message: `Evento "${title}" el ${fecha}${time ? ' ' + time : ''}`,
      link: '/agenda',
      actorId: user?.id,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white" style={{ borderColor: '#e2e8f5' }}>
          <h2 className="font-bold text-sm" style={{ color: '#1a2e3b' }}>Nuevo evento</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa]"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Título *"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Reunión SARLAF" className={INP} style={INPS} /></Field>

          {/* Tipo */}
          <div>
            <label className={LBL}>Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {([['reunion', 'Reunión'], ['auditoria', 'Auditoría'], ['otro', 'Otro']] as const).map(([id, lbl]) => (
                <button key={id} type="button" onClick={() => setTypeChoice(id)}
                  className="py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: typeChoice === id ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                    color: typeChoice === id ? '#40b5fa' : '#6b8fa0',
                    border: `1px solid ${typeChoice === id ? 'rgba(64,181,250,0.4)' : 'rgba(0,40,80,0.10)'}`,
                  }}>{lbl}</button>
              ))}
            </div>
            {typeChoice === 'otro' && (
              <input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Nombre del tipo (ej: Capacitación)" className={`${INP} mt-2`} style={INPS} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha *"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={INP} style={INPS} /></Field>
            <Field label="Hora"><input type="time" value={time} onChange={e => setTime(e.target.value)} className={INP} style={INPS} /></Field>
          </div>

          <Field label="Cliente">
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={INP} style={INPS}>
              <option value="">LCL (interno)</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          {/* Invitados */}
          <div>
            <label className={LBL}>Invitados</label>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map(p => {
                const on = invitees.has(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggleInvitee(p.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                    style={{
                      background: on ? 'rgba(167,139,250,0.10)' : '#f4f7fa',
                      color: on ? '#a78bfa' : '#6b8fa0',
                      border: `1px solid ${on ? 'rgba(167,139,250,0.35)' : 'rgba(0,40,80,0.10)'}`,
                    }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ background: on ? '#a78bfa' : '#fff', border: `1.5px solid ${on ? '#a78bfa' : 'rgba(0,40,80,0.15)'}` }}>
                      {on && <span className="text-white text-[9px]">✓</span>}
                    </span>
                    <span className="truncate">{p.full_name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <Field label="Notas"><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Opcional" className={`${INP} resize-none`} style={INPS} /></Field>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f5', color: '#6b7a9e' }}>Cancelar</button>
          <button onClick={save} disabled={saving || !title.trim() || !date} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1" style={{ background: '#40b5fa' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── INDICADORES (por responsable) ─────────────────────────────────────────────
function Indicadores({ indicators, profiles, companies, reload }: { indicators: Row[]; profiles: Row[]; companies: Row[]; reload: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', responsable_id: '', company_id: '', frequency: 'mensual', due_date: '', notas: '' })
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!form.title.trim()) { alert('Escribe el nombre del indicador.'); return }
    if (!form.due_date) { alert('Elige la fecha de la próxima entrega.'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('indicators').insert([{
      title: form.title, responsable_id: form.responsable_id || null, company_id: form.company_id || null,
      frequency: form.frequency, due_date: form.due_date, status: 'pendiente', notas: form.notas || null,
    }])
    setSaving(false)
    if (error) { alert('No se pudo guardar el indicador: ' + error.message); return }
    setForm({ title: '', responsable_id: '', company_id: '', frequency: 'mensual', due_date: '', notas: '' })
    setShowNew(false); reload()
  }
  async function toggle(ind: Row) {
    const supabase = createClient()
    const entregado = ind.status === 'entregado'
    await supabase.from('indicators').update({ status: entregado ? 'pendiente' : 'entregado' }).eq('id', ind.id)
    if (!entregado && ind.frequency) {
      await supabase.from('indicators').insert([{
        title: ind.title, responsable_id: ind.responsable_id ?? null, company_id: ind.company_id ?? null,
        frequency: ind.frequency, due_date: nextDueDate(ind.due_date, ind.frequency as Recurrence), status: 'pendiente', notas: ind.notas ?? null,
      }])
    }
    reload()
  }
  async function del(id: string) {
    const supabase = createClient()
    await supabase.from('indicators').delete().eq('id', id)
    reload()
  }

  const sinAsignar = indicators.filter(i => !i.responsable_id)
  const grupos = profiles.map(p => ({ persona: p, items: indicators.filter(i => i.responsable_id === p.id) })).filter(g => g.items.length > 0)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#40b5fa', color: '#fff' }}>
          <Plus className="w-4 h-4" />Nuevo indicador
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: '#fff', border: '1px solid rgba(64,181,250,0.25)' }}>
          <Field label="Indicador *"><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ej: Reporte mensual de riesgos" className={INP} style={INPS} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsable">
              <select value={form.responsable_id} onChange={e => setForm(p => ({ ...p, responsable_id: e.target.value }))} className={INP} style={INPS}>
                <option value="">Sin asignar</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </Field>
            <Field label="Cliente">
              <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} className={INP} style={INPS}>
                <option value="">LCL (interno)</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Frecuencia">
              <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} className={INP} style={INPS}>
                {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{RECURRENCE_CONFIG[r].label}</option>)}
              </select>
            </Field>
            <Field label="Próxima entrega *"><input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className={INP} style={INPS} /></Field>
          </div>
          <Field label="Notas"><input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Opcional" className={INP} style={INPS} /></Field>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: '#e2e8f0', color: '#6b8fa0' }}>Cancelar</button>
            <button onClick={add} disabled={saving} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#40b5fa', color: '#fff' }}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {indicators.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20" style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <Gauge className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin indicadores registrados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ persona, items }) => <IndicadorGrupo key={persona.id} nombre={persona.full_name} items={items} onToggle={toggle} onDelete={del} />)}
          {sinAsignar.length > 0 && <IndicadorGrupo nombre="Sin asignar" items={sinAsignar} onToggle={toggle} onDelete={del} />}
        </div>
      )}
    </div>
  )
}

function IndicadorGrupo({ nombre, items, onToggle, onDelete }: { nombre: string; items: Row[]; onToggle: (i: Row) => void; onDelete: (id: string) => void }) {
  const initials = nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const pend = items.filter(i => i.status !== 'entregado').length
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
        <h3 className="text-sm font-bold" style={{ color: '#1a2e3b' }}>{nombre}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>{pend} pendiente{pend !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {items.map(ind => {
          const done = ind.status === 'entregado'
          const days = daysUntil(ind.due_date)
          const isVencida = days < 0 && !done
          return (
            <div key={ind.id} className="rounded-2xl px-5 py-3.5 flex items-center gap-4"
              style={{ background: done ? 'rgba(74,222,128,0.04)' : isVencida ? 'rgba(255,107,107,0.04)' : '#fff', border: `1px solid ${done ? 'rgba(74,222,128,0.15)' : isVencida ? 'rgba(255,107,107,0.18)' : 'rgba(0,40,80,0.08)'}`, opacity: done ? 0.7 : 1 }}>
              <button onClick={() => onToggle(ind)} className="flex-shrink-0" title={done ? 'Marcar pendiente' : 'Marcar entregado'}>
                {done ? <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} /> : <Circle className="w-5 h-5" style={{ color: '#86a2b2' }} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b', textDecoration: done ? 'line-through' : 'none' }}>{ind.title}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {ind.frequency && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(52,211,153,0.10)', color: '#059669' }}>
                      <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_CONFIG[ind.frequency as Recurrence]?.short ?? ind.frequency}
                    </span>
                  )}
                  {ind.companies?.name && <span className="text-[11px]" style={{ color: '#6b8fa0' }}>{ind.companies.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs" style={{ color: done ? '#4ade80' : isVencida ? '#ff6b6b' : '#86a2b2' }}>
                  {done ? <span>✓ Entregado</span> : <><Clock className="w-3 h-3" />{days === 0 ? 'Hoy' : isVencida ? `${Math.abs(days)}d` : days === 1 ? 'Mañana' : formatDate(ind.due_date)}</>}
                </div>
                <button onClick={() => onDelete(ind.id)} className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#ff6b6b' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Estilos compartidos ───────────────────────────────────────────────────────
const INP = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none'
const INPS = { background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' } as React.CSSProperties
const LBL = 'block text-xs font-semibold tracking-wide uppercase mb-1.5'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LBL} style={{ color: '#6b8fa0' }}>{label}</label>
      {children}
    </div>
  )
}
