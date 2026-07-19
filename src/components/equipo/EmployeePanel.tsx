'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/types'
import { formatDate, daysUntil } from '@/lib/utils'
import {
  X, Clock, CheckCircle2, AlertTriangle, CalendarDays,
  Gauge, Star, AlertCircle, Plus, Loader2, Phone, FileText,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

interface Props {
  profile: Row
  currentUserRole: string
  onClose: () => void
}

const STAR_COLORS = ['', '#ff6b6b', '#fb923c', '#ffd93d', '#40b5fa', '#4ade80']

function Stars({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="w-3 h-3" fill={i <= score ? STAR_COLORS[score] : 'none'}
          style={{ color: i <= score ? STAR_COLORS[score] : '#d1d9e6' }} />
      ))}
    </span>
  )
}

function monthsSince(dateStr: string | null) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'Menos de 1 mes'
  if (months < 12) return `${months} mes${months !== 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  const rem   = months % 12
  return `${years} año${years !== 1 ? 's' : ''}${rem > 0 ? ` ${rem} mes${rem !== 1 ? 'es' : ''}` : ''}`
}

export default function EmployeePanel({ profile, currentUserRole, onClose }: Props) {
  const isAdmin = currentUserRole === 'admin'
  const initials = profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const title = ROLE_LABELS[profile.email] ?? (profile.role === 'admin' ? 'Administrador' : 'Consultor')

  const [tasks,      setTasks]      = useState<Row[]>([])
  const [events,     setEvents]     = useState<Row[]>([])
  const [indicators, setIndicators] = useState<Row[]>([])
  const [evals,      setEvals]      = useState<Row[]>([])
  const [llamados,   setLlamados]   = useState<Row[]>([])
  const [loading,    setLoading]    = useState(true)

  // Forms
  const [addingEval,    setAddingEval]    = useState(false)
  const [addingLlamado, setAddingLlamado] = useState(false)
  const [evalForm,  setEvalForm]  = useState({ title: '', date: new Date().toISOString().slice(0, 10), score: 3, notas: '' })
  const [llamForm,  setLlamForm]  = useState({ motivo: '', date: new Date().toISOString().slice(0, 10), descripcion: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const today = new Date().toISOString().slice(0, 10)
      const [t, e, i, ev, ll] = await Promise.all([
        sb.from('tasks').select('id, title, status, due_date, priority, companies(name)')
          .eq('assigned_to', profile.id).is('parent_id', null)
          .neq('status', 'completada').order('due_date'),
        sb.from('events').select('id, title, event_date, event_type')
          .gte('event_date', today)
          .contains('event_attendees', [{ profile_id: profile.id }])
          .order('event_date').limit(5),
        sb.from('indicators').select('id, title, due_date, status, companies(name)')
          .eq('responsable_id', profile.id).eq('status', 'pendiente').order('due_date').limit(5),
        sb.from('evaluaciones').select('*').eq('profile_id', profile.id).order('date', { ascending: false }),
        isAdmin
          ? sb.from('llamados_atencion').select('*').eq('profile_id', profile.id).order('date', { ascending: false })
          : Promise.resolve({ data: [] }),
      ])
      setTasks(t.data ?? [])
      setEvents(e.data ?? [])
      setIndicators(i.data ?? [])
      setEvals(ev.data ?? [])
      setLlamados((ll as { data: Row[] | null }).data ?? [])
      setLoading(false)
    }
    load()
  }, [profile.id, isAdmin])

  async function saveEval() {
    if (!evalForm.title.trim()) return
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('evaluaciones').insert([{ ...evalForm, profile_id: profile.id, created_by: user?.id }])
    const { data } = await sb.from('evaluaciones').select('*').eq('profile_id', profile.id).order('date', { ascending: false })
    setEvals(data ?? [])
    setAddingEval(false)
    setEvalForm({ title: '', date: new Date().toISOString().slice(0, 10), score: 3, notas: '' })
    setSaving(false)
  }

  async function saveLlamado() {
    if (!llamForm.motivo.trim()) return
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('llamados_atencion').insert([{ ...llamForm, profile_id: profile.id, created_by: user?.id }])
    const { data } = await sb.from('llamados_atencion').select('*').eq('profile_id', profile.id).order('date', { ascending: false })
    setLlamados(data ?? [])
    setAddingLlamado(false)
    setLlamForm({ motivo: '', date: new Date().toISOString().slice(0, 10), descripcion: '' })
    setSaving(false)
  }

  const pending   = tasks.filter(t => t.status !== 'completada' && daysUntil(t.due_date) >= 0).length
  const overdue   = tasks.filter(t => daysUntil(t.due_date) < 0).length

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-[420px] shadow-2xl animate-slide-in-right"
        style={{ background: '#fff', borderLeft: '1px solid rgba(0,40,80,0.10)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4" style={{ borderBottom: '1px solid rgba(0,40,80,0.08)' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black flex-shrink-0"
                style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
              <div>
                <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>{profile.full_name}</h2>
                <p className="text-xs" style={{ color: '#6b8fa0' }}>{title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#f4f7fa]" style={{ color: '#6b8fa0' }}>
              <X size={16} />
            </button>
          </div>

          {profile.bio && (
            <p className="text-sm mb-2" style={{ color: '#4a5a6b' }}>{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-3">
            {profile.start_date && (
              <span className="text-[11px] flex items-center gap-1" style={{ color: '#6b8fa0' }}>
                <CalendarDays className="w-3 h-3" />
                Desde {new Date(profile.start_date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                {' '}· {monthsSince(profile.start_date)}
              </span>
            )}
            {profile.phone && (
              <span className="text-[11px] flex items-center gap-1" style={{ color: '#6b8fa0' }}>
                <Phone className="w-3 h-3" />{profile.phone}
              </span>
            )}
          </div>

          {/* Stats */}
          {!loading && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'Pendientes', value: pending,       color: '#40b5fa' },
                { label: 'Vencidas',   value: overdue,       color: '#ff6b6b' },
                { label: 'Indicadores',value: indicators.length, color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-3 py-2 text-center" style={{ background: '#f4f7fa' }}>
                  <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: '#86a2b2' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#40b5fa' }} /></div>
          ) : (
            <>
              {/* Tareas activas */}
              <Section title="Tareas activas" icon={<CheckCircle2 className="w-3.5 h-3.5" />} count={tasks.length}>
                {tasks.length === 0
                  ? <Empty text="Sin tareas activas" />
                  : tasks.slice(0, 6).map(t => {
                    const days = daysUntil(t.due_date)
                    const vencida = days < 0
                    return (
                      <div key={t.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                        style={{ background: vencida ? 'rgba(255,107,107,0.04)' : '#f4f7fa', border: `1px solid ${vencida ? 'rgba(255,107,107,0.15)' : 'rgba(0,40,80,0.05)'}` }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: '#1a2e3b' }}>{t.title}</p>
                          {t.companies?.name && <p className="text-[10px]" style={{ color: '#86a2b2' }}>{t.companies.name}</p>}
                        </div>
                        <span className="text-[10px] flex items-center gap-1 flex-shrink-0"
                          style={{ color: vencida ? '#ff6b6b' : '#86a2b2' }}>
                          {vencida ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {days === 0 ? 'Hoy' : vencida ? `${Math.abs(days)}d` : formatDate(t.due_date)}
                        </span>
                      </div>
                    )
                  })
                }
              </Section>

              {/* Próximos eventos */}
              <Section title="Próximos eventos" icon={<CalendarDays className="w-3.5 h-3.5" />} count={events.length}>
                {events.length === 0
                  ? <Empty text="Sin eventos próximos" />
                  : events.map(e => (
                    <div key={e.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: '#f4f7fa' }}>
                      <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#40b5fa' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: '#1a2e3b' }}>{e.title}</p>
                      </div>
                      <span className="text-[10px]" style={{ color: '#86a2b2' }}>{formatDate(e.event_date)}</span>
                    </div>
                  ))
                }
              </Section>

              {/* Indicadores */}
              <Section title="Indicadores pendientes" icon={<Gauge className="w-3.5 h-3.5" />} count={indicators.length}>
                {indicators.length === 0
                  ? <Empty text="Sin indicadores pendientes" />
                  : indicators.map(i => {
                    const days = daysUntil(i.due_date)
                    return (
                      <div key={i.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: '#f4f7fa' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: '#1a2e3b' }}>{i.title}</p>
                          {i.companies?.name && <p className="text-[10px]" style={{ color: '#86a2b2' }}>{i.companies.name}</p>}
                        </div>
                        <span className="text-[10px] flex-shrink-0" style={{ color: days < 0 ? '#ff6b6b' : '#86a2b2' }}>
                          {days < 0 ? `${Math.abs(days)}d vencido` : days === 0 ? 'Hoy' : formatDate(i.due_date)}
                        </span>
                      </div>
                    )
                  })
                }
              </Section>

              {/* Evaluaciones */}
              <Section title="Evaluaciones" icon={<Star className="w-3.5 h-3.5" />} count={evals.length}
                action={isAdmin ? { label: 'Nueva', onClick: () => setAddingEval(v => !v) } : undefined}>
                {isAdmin && addingEval && (
                  <div className="rounded-xl p-3 mb-2 space-y-2" style={{ background: '#f4f7fa', border: '1px solid rgba(64,181,250,0.2)' }}>
                    <input value={evalForm.title} onChange={e => setEvalForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Título de la evaluación" className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                      style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                    <div className="flex gap-2">
                      <input type="date" value={evalForm.date} onChange={e => setEvalForm(p => ({ ...p, date: e.target.value }))}
                        className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
                        style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                      <select value={evalForm.score} onChange={e => setEvalForm(p => ({ ...p, score: Number(e.target.value) }))}
                        className="text-xs px-2 py-2 rounded-lg outline-none"
                        style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
                      </select>
                    </div>
                    <textarea value={evalForm.notas} onChange={e => setEvalForm(p => ({ ...p, notas: e.target.value }))}
                      placeholder="Notas (opcional)" rows={2}
                      className="w-full text-xs px-3 py-2 rounded-lg outline-none resize-none"
                      style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                    <div className="flex gap-2">
                      <button onClick={saveEval} disabled={saving}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                        style={{ background: '#40b5fa', color: '#fff' }}>
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                      </button>
                      <button onClick={() => setAddingEval(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#e2e8f0', color: '#6b8fa0' }}>✕</button>
                    </div>
                  </div>
                )}
                {evals.length === 0 ? <Empty text="Sin evaluaciones registradas" /> : evals.map(e => (
                  <div key={e.id} className="flex items-start gap-2.5 rounded-xl px-3 py-2" style={{ background: '#f4f7fa' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: '#1a2e3b' }}>{e.title}</p>
                      {e.notas && <p className="text-[10px] mt-0.5" style={{ color: '#86a2b2' }}>{e.notas}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Stars score={e.score} />
                      <span className="text-[10px]" style={{ color: '#86a2b2' }}>{formatDate(e.date)}</span>
                    </div>
                  </div>
                ))}
              </Section>

              {/* Llamados de atención (admin only) */}
              {isAdmin && (
                <Section title="Llamados de atención" icon={<AlertCircle className="w-3.5 h-3.5" />} count={llamados.length}
                  action={{ label: 'Registrar', onClick: () => setAddingLlamado(v => !v) }}>
                  {addingLlamado && (
                    <div className="rounded-xl p-3 mb-2 space-y-2" style={{ background: 'rgba(255,107,107,0.04)', border: '1px solid rgba(255,107,107,0.15)' }}>
                      <input value={llamForm.motivo} onChange={e => setLlamForm(p => ({ ...p, motivo: e.target.value }))}
                        placeholder="Motivo del llamado" className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                        style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                      <div className="flex gap-2">
                        <input type="date" value={llamForm.date} onChange={e => setLlamForm(p => ({ ...p, date: e.target.value }))}
                          className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
                          style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                      </div>
                      <textarea value={llamForm.descripcion} onChange={e => setLlamForm(p => ({ ...p, descripcion: e.target.value }))}
                        placeholder="Descripción (opcional)" rows={2}
                        className="w-full text-xs px-3 py-2 rounded-lg outline-none resize-none"
                        style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                      <div className="flex gap-2">
                        <button onClick={saveLlamado} disabled={saving}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                          style={{ background: '#ff6b6b', color: '#fff' }}>
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Registrar'}
                        </button>
                        <button onClick={() => setAddingLlamado(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#e2e8f0', color: '#6b8fa0' }}>✕</button>
                      </div>
                    </div>
                  )}
                  {llamados.length === 0 ? <Empty text="Sin llamados registrados" /> : llamados.map(l => (
                    <div key={l.id} className="flex items-start gap-2.5 rounded-xl px-3 py-2"
                      style={{ background: 'rgba(255,107,107,0.04)', border: '1px solid rgba(255,107,107,0.10)' }}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#ff6b6b' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: '#1a2e3b' }}>{l.motivo}</p>
                        {l.descripcion && <p className="text-[10px] mt-0.5" style={{ color: '#86a2b2' }}>{l.descripcion}</p>}
                        <p className="text-[10px] mt-0.5" style={{ color: '#b0bcc7' }}>{formatDate(l.date)}</p>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Notas de perfil (editable por admin) */}
              {profile.bio || profile.start_date || profile.phone ? null : isAdmin && (
                <div className="rounded-xl px-4 py-3 text-xs text-center" style={{ background: '#f4f7fa', color: '#86a2b2' }}>
                  <FileText className="w-4 h-4 mx-auto mb-1" />
                  Edita el perfil desde Configuración para agregar bio, fecha de ingreso y teléfono.
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}

function Section({ title, icon, count, action, children }: {
  title: string; icon: React.ReactNode; count: number
  action?: { label: string; onClick: () => void }; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5"
          style={{ color: '#86a2b2' }}>
          {icon}{title}{count > 0 && ` · ${count}`}
        </h3>
        {action && (
          <button onClick={action.onClick}
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
            style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
            <Plus className="w-2.5 h-2.5" />{action.label}
          </button>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-center py-3" style={{ color: '#b0bcc7' }}>{text}</p>
}
