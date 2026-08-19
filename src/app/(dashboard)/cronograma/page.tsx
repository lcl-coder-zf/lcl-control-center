'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pushNotify } from '@/lib/push-client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2, Check, Clock,
  CalendarRange, Pencil, RotateCcw, Trash2,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

const SESSIONS: Record<string, string> = {
  todo_el_dia:   'Todo el día',
  medio_manana:  'Medio día · mañana (AM)',
  medio_tarde:   'Medio día · tarde (PM)',
  personalizado: 'Horario específico',
  no_aplica:     'No aplica',
}

// Etiqueta corta de la celda. Antes decía solo "Mañana", que se leía como
// "el día de mañana" en vez de "la mañana de este día". ½ AM no se presta.
function sessionBadge(entry: Row): string | null {
  if (!entry?.session || entry.session === 'todo_el_dia') return null
  if (entry.session === 'medio_manana') return '½ AM'
  if (entry.session === 'medio_tarde')  return '½ PM'
  if (entry.session === 'no_aplica')    return 'N/A'
  if (entry.session === 'personalizado' && entry.start_time && entry.end_time) {
    return `${entry.start_time.slice(0, 5)}–${entry.end_time.slice(0, 5)}`
  }
  return entry.session
}

// Orden dentro del día: primero lo explícito, luego mañana antes que tarde.
const PESO_SESION: Record<string, number> = {
  todo_el_dia: 0, medio_manana: 1, personalizado: 2, medio_tarde: 3, no_aplica: 4,
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  programado: { bg: 'rgba(64,181,250,0.07)', border: 'rgba(64,181,250,0.20)', text: '#1a2e3b' },
  cumplido:   { bg: 'rgba(74,222,128,0.10)', border: 'rgba(74,222,128,0.25)', text: '#059669' },
  no_aplica:  { bg: 'rgba(0,40,80,0.04)',    border: 'rgba(0,40,80,0.08)',    text: '#86a2b2' },
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatWeekLabel(monday: Date): string {
  const fri = addDays(monday, 4)
  const fmt = (d: Date) => d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  return `${fmt(monday)} – ${fmt(fri)} de ${fri.getFullYear()}`
}

export default function CronogramaPage() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Row[]>([])
  const [companies, setCompanies] = useState<Row[]>([])
  const [entries, setEntries] = useState<Row[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all')
  const [editCell, setEditCell] = useState<{ profile: Row; dayIdx: number } | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [meId, setMeId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string>('consultant')

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(async (ws: Date) => {
    const supabase = createClient()
    const weekKey = toKey(ws)
    const { data: { user } } = await supabase.auth.getUser()
    const [p, c, e, me] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role').order('full_name'),
      supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
      supabase.from('schedule_entries').select('*, companies(name)').eq('week_start', weekKey),
      user ? supabase.from('profiles').select('id, role').eq('id', user.id).single() : Promise.resolve({ data: null }),
    ])
    setProfiles(p.data ?? [])
    setCompanies(c.data ?? [])
    setEntries(e.data ?? [])
    const mine = (me as { data: { id: string; role: string } | null }).data
    setMeId(mine?.id ?? user?.id ?? null)
    setMyRole(mine?.role ?? 'consultant')
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [load, weekStart])

  function moveWeek(delta: number) {
    setWeekStart(prev => addDays(prev, delta * 7))
  }

  function goToday() {
    setWeekStart(getMonday(new Date()))
  }

  // Un día puede tener varias actividades: medio día en un cliente y medio
  // día en otro. Se devuelven ordenadas para que la celda se lea de arriba
  // (mañana) hacia abajo (tarde).
  function entriesFor(profileId: string, dayIdx: number): Row[] {
    return entries
      .filter(e => e.profile_id === profileId && e.day_of_week === dayIdx)
      .sort((a, b) => {
        const porOrden = (a.orden ?? 0) - (b.orden ?? 0)
        if (porOrden !== 0) return porOrden
        return (PESO_SESION[a.session] ?? 9) - (PESO_SESION[b.session] ?? 9)
      })
  }

  // Los admin (Daniel, Isabel, Laura) ven a todo el equipo; las consultoras
  // solo se ven a sí mismas (mismo criterio que el módulo Tareas).
  const isAdmin = myRole === 'admin'
  const consultants = isAdmin
    ? profiles.filter(p => p.role === 'consultant' || p.role === 'admin')
    : profiles.filter(p => p.id === meId)
  const displayConsultants = selectedConsultant === 'all'
    ? consultants
    : consultants.filter(c => c.id === selectedConsultant)

  if (loading) return <PageSkeleton />

  const isCurrentWeek = toKey(weekStart) === toKey(getMonday(new Date()))

  // Day dates for header
  const dayDates = DAYS.map((_, i) => addDays(weekStart, i))
  const todayKey = toKey(new Date())

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 06</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Cronograma</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>Programación semanal del equipo</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => moveWeek(-1)} className="p-2 rounded-xl" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)', color: '#1a2e3b', minWidth: 220, textAlign: 'center' }}>
            {formatWeekLabel(weekStart)}
          </div>
          <button onClick={() => moveWeek(1)} className="p-2 rounded-xl" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isCurrentWeek && (
          <button onClick={goToday} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.25)' }}>
            <RotateCcw className="w-3 h-3" />Semana actual
          </button>
        )}
      </div>

      {/* Consultant filter (mobile) */}
      {!isDesktop && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setSelectedConsultant('all')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
            style={{ background: selectedConsultant === 'all' ? 'rgba(64,181,250,0.15)' : '#f4f7fa', color: selectedConsultant === 'all' ? '#40b5fa' : '#6b8fa0', border: `1px solid ${selectedConsultant === 'all' ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}` }}>
            Todos
          </button>
          {consultants.map(c => (
            <button key={c.id} onClick={() => setSelectedConsultant(c.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
              style={{ background: selectedConsultant === c.id ? 'rgba(64,181,250,0.15)' : '#f4f7fa', color: selectedConsultant === c.id ? '#40b5fa' : '#6b8fa0', border: `1px solid ${selectedConsultant === c.id ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}` }}>
              {c.full_name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
        {/* Header row: days */}
        <div className="grid" style={{ gridTemplateColumns: isDesktop ? '160px repeat(5, 1fr)' : '100px repeat(5, 1fr)' }}>
          <div className="px-4 py-3 border-b border-r" style={{ borderColor: 'rgba(0,40,80,0.08)', background: '#fafbfc' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#86a2b2' }}>
              {isDesktop ? 'Consultora' : ''}
            </span>
          </div>
          {DAYS.map((day, i) => {
            const dayKey = toKey(dayDates[i])
            const isToday = dayKey === todayKey
            return (
              <div key={day} className="px-2 py-3 text-center border-b"
                style={{
                  borderColor: 'rgba(0,40,80,0.08)',
                  borderRight: i < 4 ? '1px solid rgba(0,40,80,0.06)' : 'none',
                  background: isToday ? 'rgba(64,181,250,0.05)' : '#fafbfc',
                }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isToday ? '#40b5fa' : '#86a2b2' }}>
                  {isDesktop ? day : DAY_SHORT[i]}
                </div>
                <div className="text-xs font-bold mt-0.5" style={{ color: isToday ? '#40b5fa' : '#1a2e3b' }}>
                  {dayDates[i].getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Consultant rows */}
        {displayConsultants.map((profile, pIdx) => (
          <div key={profile.id} className="grid"
            style={{
              gridTemplateColumns: isDesktop ? '160px repeat(5, 1fr)' : '100px repeat(5, 1fr)',
              borderBottom: pIdx < displayConsultants.length - 1 ? '1px solid rgba(0,40,80,0.06)' : 'none',
            }}>
            {/* Consultant name */}
            <div className="px-3 py-3 flex items-center border-r" style={{ borderColor: 'rgba(0,40,80,0.08)' }}>
              <div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mb-1"
                  style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
                  {profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <p className="text-[11px] font-semibold leading-tight" style={{ color: '#1a2e3b' }}>
                  {profile.full_name.split(' ')[0]}
                </p>
                {isDesktop && (
                  <p className="text-[10px]" style={{ color: '#86a2b2' }}>
                    {profile.full_name.split(' ').slice(1).join(' ')}
                  </p>
                )}
              </div>
            </div>

            {/* Day cells */}
            {DAYS.map((_, dayIdx) => {
              const dayEntries = entriesFor(profile.id, dayIdx)
              const dayKey = toKey(dayDates[dayIdx])

              return (
                <CronogramaCell
                  key={dayIdx}
                  entries={dayEntries}
                  isToday={dayKey === todayKey}
                  isLast={dayIdx === 4}
                  onClick={() => setEditCell({ profile, dayIdx })}
                />
              )
            })}
          </div>
        ))}

        {displayConsultants.length === 0 && (
          <div className="flex items-center justify-center py-16" style={{ color: '#6b8fa0' }}>
            <div className="text-center">
              <CalendarRange className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sin consultores en el equipo</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: val.bg, border: `1px solid ${val.border}` }} />
            <span className="text-[11px]" style={{ color: '#86a2b2', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Modal del día: lista de actividades + alta/edición */}
      {editCell && (
        <DiaModal
          profile={editCell.profile}
          dayIdx={editCell.dayIdx}
          dayDate={dayDates[editCell.dayIdx]}
          weekStart={weekStart}
          companies={companies}
          entries={entriesFor(editCell.profile.id, editCell.dayIdx)}
          onClose={() => setEditCell(null)}
          onReload={() => load(weekStart)}
        />
      )}
    </div>
  )
}

function CronogramaCell({ entries, isToday, isLast, onClick }: {
  entries: Row[]; isToday: boolean; isLast: boolean; onClick: () => void
}) {
  const [hov, setHov] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative p-2 min-h-[72px] cursor-pointer transition-all"
      style={{
        borderRight: !isLast ? '1px solid rgba(0,40,80,0.06)' : 'none',
        background: isToday ? 'rgba(64,181,250,0.03)' : 'transparent',
      }}>
      {entries.length > 0 ? (
        <div className="flex flex-col gap-1 h-full">
          {entries.map(entry => {
            const sc = STATUS_COLORS[entry.status ?? 'programado']
            const badge = sessionBadge(entry)
            return (
              <div key={entry.id} className="rounded-lg px-2 py-1.5 transition-all"
                style={{
                  background: hov ? 'rgba(64,181,250,0.08)' : sc.bg,
                  border: `1px solid ${hov ? 'rgba(64,181,250,0.3)' : sc.border}`,
                }}>
                <div className="flex items-start gap-1">
                  <p className="text-[11px] font-semibold leading-tight flex-1 min-w-0"
                    style={{
                      color: sc.text,
                      textDecoration: entry.status === 'no_aplica' ? 'line-through' : 'none',
                    }}>
                    {entry.companies?.name || entry.activity || '—'}
                  </p>
                  {entry.status === 'cumplido' && (
                    <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#4ade80' }} />
                  )}
                </div>
                {entry.companies?.name && entry.activity && (
                  <p className="text-[10px] leading-tight" style={{ color: '#86a2b2' }}>{entry.activity}</p>
                )}
                {badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded mt-1"
                    style={{ background: 'rgba(0,40,80,0.06)', color: '#6b8fa0', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <Clock className="w-2 h-2" />{badge}
                  </span>
                )}
              </div>
            )
          })}
          {hov && (
            <div className="flex items-center justify-center gap-1 rounded-lg py-1"
              style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa' }}>
              <Plus className="w-3 h-3" />
              <span className="text-[9px] font-semibold">Agregar</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          {hov && (
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
              <Plus className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Modal del día: lista lo que ya hay y deja agregar más actividades, que es
// lo que faltaba cuando alguien atiende dos clientes el mismo día.
function DiaModal({
  profile, dayIdx, dayDate, weekStart, companies, entries, onClose, onReload,
}: {
  profile: Row
  dayIdx: number
  dayDate: Date
  weekStart: Date
  companies: Row[]
  entries: Row[]
  onClose: () => void
  onReload: () => void
}) {
  // null = no hay formulario abierto · 'nueva' = alta · Row = edición
  const [editando, setEditando] = useState<Row | 'nueva' | null>(entries.length === 0 ? 'nueva' : null)
  const [borrando, setBorrando] = useState<string | null>(null)

  const dayLabel = DAYS[dayIdx]
  const dateLabel = dayDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })

  async function borrar(entry: Row) {
    if (!confirm('¿Eliminar esta actividad?')) return
    setBorrando(entry.id)
    const supabase = createClient()
    await supabase.from('schedule_entries').delete().eq('id', entry.id)
    setBorrando(null)
    onReload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#e2e8f5' }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#1a2e3b' }}>{dayLabel} {dateLabel}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b8fa0' }}>
              {profile.full_name}
              {entries.length > 0 && ` · ${entries.length} actividad${entries.length > 1 ? 'es' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <X size={14} />
          </button>
        </div>

        {/* Lista de actividades del día */}
        {entries.length > 0 && (
          <div className="px-5 pt-4 space-y-2">
            {entries.map(entry => {
              const sc = STATUS_COLORS[entry.status ?? 'programado']
              const badge = sessionBadge(entry)
              const enEdicion = typeof editando === 'object' && editando?.id === entry.id
              return (
                <div key={entry.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                  style={{ background: enEdicion ? 'rgba(64,181,250,0.06)' : sc.bg, border: `1px solid ${enEdicion ? 'rgba(64,181,250,0.35)' : sc.border}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: sc.text }}>
                      {entry.companies?.name || entry.activity || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {badge && (
                        <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b8fa0' }}>
                          <Clock className="w-2.5 h-2.5" />{badge}
                        </span>
                      )}
                      {entry.companies?.name && entry.activity && (
                        <span className="text-[10px] truncate" style={{ color: '#86a2b2' }}>{entry.activity}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setEditando(enEdicion ? null : entry)} title="Editar"
                    className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#fff', color: '#40b5fa' }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => borrar(entry)} disabled={borrando === entry.id} title="Eliminar"
                    className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#fff', color: '#ff6b6b' }}>
                    {borrando === entry.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )
            })}

            {editando === null && (
              <button onClick={() => setEditando('nueva')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa', border: '1px dashed rgba(64,181,250,0.4)' }}>
                <Plus className="w-3.5 h-3.5" />Agregar otra actividad
              </button>
            )}
          </div>
        )}

        {/* Formulario de alta / edición */}
        {editando !== null && (
          <EntradaForm
            key={editando === 'nueva' ? 'nueva' : editando.id}
            profile={profile}
            dayIdx={dayIdx}
            dayLabel={dayLabel}
            dateLabel={dateLabel}
            weekStart={weekStart}
            companies={companies}
            existing={editando === 'nueva' ? null : editando}
            orden={entries.length}
            onCancel={() => (entries.length === 0 ? onClose() : setEditando(null))}
            onSaved={() => { setEditando(null); onReload() }}
          />
        )}

        {entries.length === 0 && editando === null && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm mb-3" style={{ color: '#86a2b2' }}>Sin actividades este día.</p>
            <button onClick={() => setEditando('nueva')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa', border: '1px dashed rgba(64,181,250,0.4)' }}>
              <Plus className="w-3.5 h-3.5" />Agregar actividad
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EntradaForm({
  profile, dayIdx, dayLabel, dateLabel, weekStart, companies, existing, orden, onCancel, onSaved,
}: {
  profile: Row
  dayIdx: number
  dayLabel: string
  dateLabel: string
  weekStart: Date
  companies: Row[]
  existing: Row | null
  orden: number
  onCancel: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [activityType, setActivityType] = useState<'cliente' | 'libre'>(
    existing?.company_id ? 'cliente' : 'libre'
  )
  const [companyId, setCompanyId] = useState(existing?.company_id ?? '')
  const [activity, setActivity] = useState(existing?.activity ?? '')
  const [session, setSession] = useState(existing?.session ?? 'todo_el_dia')
  const [startTime, setStartTime] = useState(existing?.start_time ?? '')
  const [endTime, setEndTime] = useState(existing?.end_time ?? '')
  const [notas, setNotas] = useState(existing?.notas ?? '')
  const [status, setStatus] = useState(existing?.status ?? 'programado')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activityType === 'libre') inputRef.current?.focus()
  }, [activityType])

  async function save() {
    if (activityType === 'cliente' && !companyId) { alert('Selecciona un cliente'); return }
    if (activityType === 'libre' && !activity.trim()) { alert('Escribe la actividad'); return }
    setSaving(true)
    const supabase = createClient()
    const weekKey = toKey(weekStart)

    if (session === 'personalizado') {
      if (!startTime) { alert('Ingresa la hora de inicio'); setSaving(false); return }
      if (!endTime)   { alert('Ingresa la hora de fin'); setSaving(false); return }
    }

    const payload = {
      profile_id: profile.id,
      week_start: weekKey,
      day_of_week: dayIdx,
      company_id: activityType === 'cliente' ? companyId : null,
      activity: activityType === 'libre' ? activity.trim() : (activity.trim() || null),
      session,
      start_time: session === 'personalizado' ? startTime : null,
      end_time:   session === 'personalizado' ? endTime   : null,
      notas: notas.trim() || null,
      status,
      orden: existing?.orden ?? orden,
    }

    if (existing) {
      await supabase.from('schedule_entries').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('schedule_entries').insert([payload])
      // Push al consultor avisando que le programaron algo
      const actividadLabel = activityType === 'cliente'
        ? (companies.find(c => c.id === companyId)?.name ?? 'un cliente')
        : activity.trim()
      await pushNotify(supabase, {
        title: '📅 Cronograma actualizado',
        body: `${dayLabel} ${dateLabel}: ${actividadLabel}`,
        url: '/cronograma',
        recipientIds: [profile.id],
        toAdmins: true,
      })
    }

    setSaving(false)
    onSaved()
  }

  const INP: React.CSSProperties = {
    background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)',
    color: '#1a2e3b', borderRadius: 12, padding: '10px 14px',
    fontSize: 13, width: '100%', outline: 'none',
  }

  return (
    <div>
        <div className="px-5 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#40b5fa' }}>
            {existing ? 'Editar actividad' : 'Nueva actividad'}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Tipo de actividad */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6b8fa0' }}>Actividad</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[['cliente', 'Cliente'], ['libre', 'Libre']] .map(([id, lbl]) => (
                <button key={id} type="button" onClick={() => setActivityType(id as 'cliente' | 'libre')}
                  className="py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: activityType === id ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                    color: activityType === id ? '#40b5fa' : '#6b8fa0',
                    border: `1px solid ${activityType === id ? 'rgba(64,181,250,0.4)' : 'rgba(0,40,80,0.10)'}`,
                  }}>{lbl}</button>
              ))}
            </div>

            {activityType === 'cliente' ? (
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={INP}>
                <option value="">Seleccionar cliente...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <input
                ref={inputRef}
                value={activity} onChange={e => setActivity(e.target.value)}
                placeholder="Ej: Diplomado, Festivo, Reunión interna..."
                style={INP} />
            )}
            {/* Si es cliente, puede agregar texto adicional */}
            {activityType === 'cliente' && companyId && (
              <input
                value={activity} onChange={e => setActivity(e.target.value)}
                placeholder="Descripción adicional (opcional)"
                style={{ ...INP, marginTop: 8 }} />
            )}
          </div>

          {/* Sesión */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6b8fa0' }}>Horario</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SESSIONS).map(([key, lbl]) => (
                <button key={key} type="button" onClick={() => setSession(key)}
                  className="py-2 px-3 rounded-xl text-xs font-medium text-left flex items-center gap-2"
                  style={{
                    background: session === key ? 'rgba(64,181,250,0.10)' : '#f4f7fa',
                    color: session === key ? '#40b5fa' : '#6b8fa0',
                    border: `1px solid ${session === key ? 'rgba(64,181,250,0.35)' : 'rgba(0,40,80,0.08)'}`,
                  }}>
                  <span className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: session === key ? '#40b5fa' : '#fff', border: `1.5px solid ${session === key ? '#40b5fa' : 'rgba(0,40,80,0.15)'}` }}>
                    {session === key && <span className="text-white text-[8px]">✓</span>}
                  </span>
                  {lbl}
                </button>
              ))}
            </div>

            {/* Time inputs when "Horario específico" */}
            {session === 'personalizado' && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#86a2b2' }}>Desde</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{ ...INP, textAlign: 'center', fontWeight: 600 }}
                  />
                </div>
                <div className="pt-4" style={{ color: '#86a2b2', fontSize: 18, fontWeight: 700 }}>→</div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#86a2b2' }}>Hasta</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    style={{ ...INP, textAlign: 'center', fontWeight: 600 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6b8fa0' }}>Estado</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'programado', label: 'Programado', color: '#40b5fa' },
                { id: 'cumplido', label: 'Cumplido', color: '#4ade80' },
                { id: 'no_aplica', label: 'No aplica', color: '#86a2b2' },
              ].map(s => (
                <button key={s.id} type="button" onClick={() => setStatus(s.id)}
                  className="py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: status === s.id ? `${s.color}20` : '#f4f7fa',
                    color: status === s.id ? s.color : '#6b8fa0',
                    border: `1px solid ${status === s.id ? `${s.color}40` : 'rgba(0,40,80,0.08)'}`,
                  }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Ej: Reunión 8am, traer documentos..."
              style={{ ...INP, resize: 'none' } as React.CSSProperties} />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f5', color: '#6b7a9e' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1"
            style={{ background: '#40b5fa' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? 'Guardar' : 'Agregar'}
          </button>
        </div>
    </div>
  )
}
