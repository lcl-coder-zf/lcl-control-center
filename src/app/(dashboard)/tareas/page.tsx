'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, ListChecks, CalendarClock, Search, ArrowDownUp, X, Clock, AlertTriangle, Check, RefreshCw as RefreshIcon, ArrowRight } from 'lucide-react'
import TareasList from './TareasList'
import FechasClave from './FechasClave'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { effectiveStatus, taskCompanyNames } from '@/lib/tasks'
import { formatDate, daysUntil } from '@/lib/utils'

// Config visual de cada KPI/estado (para las tarjetas y el panel lateral).
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendientes',  color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
  en_progreso: { label: 'En progreso', color: '#7c5cf5', bg: 'rgba(167,139,250,0.14)' },
  vencida:     { label: 'Vencidas',    color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
  completada:  { label: 'Completadas', color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assigneeNamesOf(t: any): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromJunction = (t.task_assignees ?? []).map((a: any) => a.profiles?.full_name).filter(Boolean)
  if (fromJunction.length > 0) return fromJunction
  if (t.profiles?.full_name) return [t.profiles.full_name]
  return []
}

// Orden de la lista. Por defecto la última agregada primero.
const SORT_OPTIONS = [
  { id: 'reciente',  label: 'Última agregada' },
  { id: 'antigua',   label: 'Primera agregada' },
  { id: 'vence_asc', label: 'Vence primero' },
  { id: 'vence_desc',label: 'Vence después' },
  { id: 'prioridad', label: 'Prioridad' },
  { id: 'alfabetico',label: 'Alfabético (A–Z)' },
] as const
type SortId = typeof SORT_OPTIONS[number]['id']

const PRIORITY_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 }

export default function TareasPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState('todas')
  const [prioridad, setPrioridad] = useState('todas')
  const [asignado, setAsignado] = useState('todas')
  const [tipo, setTipo] = useState('todas')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortId>('reciente')
  const [peek, setPeek] = useState<string | null>(null)   // KPI abierto en el panel lateral
  const [vista, setVista] = useState<'lista' | 'fechas'>('lista')
  const [role, setRole] = useState<string>('consultant')
  const [myId, setMyId] = useState<string | null>(null)
  const isAdmin = role === 'admin'

  const fetchTasks = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select('*, companies(id, name), projects(id, name), profiles!tasks_assigned_to_fkey(id, full_name), task_assignees(profile_id, profiles(id, full_name)), task_companies(company_id, companies(id, name))')
      .order('due_date', { ascending: true })
    return data ?? []
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      Promise.all([
        fetchTasks(),
        supabase.from('profiles').select('id, full_name').order('full_name'),
        supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
        user
          ? supabase.from('profiles').select('id, role').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
      ]).then(([t, { data: p }, { data: c }, myProfile]) => {
        setTasks(t)
        setProfiles(p ?? [])
        setCompanies(c ?? [])
        const me = (myProfile as { data: { id: string; role: string } | null }).data
        const uid = me?.id ?? user?.id ?? null
        setMyId(uid)
        setRole(me?.role ?? 'consultant')
        // Al entrar, el filtro arranca en las tareas del usuario logueado (su badge).
        // Los admin pueden cambiar a otra persona o Todos; las consultoras quedan fijas.
        if (uid) setAsignado(uid)
        setLoading(false)
      })
    })
  }, [fetchTasks])

  const refreshTasks = useCallback(async () => {
    setRefreshing(true)
    const data = await fetchTasks()
    setTasks(data)
    setRefreshing(false)
  }, [fetchTasks])

  const mainTasks = useMemo(() => tasks.filter(t => !t.parent_id), [tasks])

  // Las consultoras solo ven sus propias tareas en este módulo; los admin ven todo.
  const isMine = useCallback((t: any) =>
    t.assigned_to === myId || (t.task_assignees ?? []).some((a: any) => a.profile_id === myId),
  [myId])

  const scoped = useMemo(
    () => (isAdmin ? mainTasks : mainTasks.filter(isMine)),
    [isAdmin, mainTasks, isMine],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = scoped.filter(t => {
      // "vencida" es derivado de la fecha (nada lo guarda en BD), así que el
      // filtro compara contra el estado efectivo, no contra t.status.
      const matchStatus = status === 'todas' || effectiveStatus(t) === status
      const matchPrioridad = prioridad === 'todas' || t.priority === prioridad
      const matchAsignado = asignado === 'todas'
        || t.assigned_to === asignado
        || (t.task_assignees ?? []).some((a: any) => a.profile_id === asignado)
      const matchTipo = tipo === 'todas' || (tipo === 'recurrente' ? t.task_type === 'recurrente' : t.task_type !== 'recurrente')
      const matchSearch = !q
        || (t.title ?? '').toLowerCase().includes(q)
        || (t.description ?? '').toLowerCase().includes(q)
        || taskCompanyNames(t).join(' ').toLowerCase().includes(q)
      return matchStatus && matchPrioridad && matchAsignado && matchTipo && matchSearch
    })

    const dir = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'antigua':    return dir(a.created_at ?? '', b.created_at ?? '')
        case 'vence_asc':  return dir(a.due_date ?? '9999', b.due_date ?? '9999')
        case 'vence_desc': return dir(b.due_date ?? '', a.due_date ?? '')
        case 'prioridad':  return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
        case 'alfabetico': return dir((a.title ?? '').toLowerCase(), (b.title ?? '').toLowerCase())
        case 'reciente':
        default:           return dir(b.created_at ?? '', a.created_at ?? '')
      }
    })
  }, [scoped, status, prioridad, asignado, tipo, search, sort])

  const counts = {
    pendiente:   scoped.filter(t => effectiveStatus(t) === 'pendiente').length,
    en_progreso: scoped.filter(t => effectiveStatus(t) === 'en_progreso').length,
    vencida:     scoped.filter(t => effectiveStatus(t) === 'vencida').length,
    completada:  scoped.filter(t => effectiveStatus(t) === 'completada').length,
  }

  const pColors: Record<string, string> = { critica: '#ff6b6b', alta: '#fb923c', media: '#ffd93d', baja: '#4ade80' }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 03</p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Tareas</h1>
          <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>
            {vista === 'fechas'
              ? 'Lo que viene, por mes y por cliente'
              : `${filtered.length} tarea${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshTasks} disabled={refreshing} title="Actualizar"
            className="p-2.5 rounded-xl transition-all"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.08)' }}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/tareas/nueva"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            <Plus className="w-4 h-4" />Nueva tarea
          </Link>
        </div>
      </div>

      {/* Vistas: la lista de siempre y el calendario de fechas clave */}
      <div className="flex gap-2 mb-6">
        {([
          { id: 'lista',  label: 'Lista',        icon: ListChecks },
          { id: 'fechas', label: 'Fechas clave', icon: CalendarClock },
        ] as const).map(v => {
          const on = vista === v.id
          const Icon = v.icon
          return (
            <button key={v.id} onClick={() => setVista(v.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: on ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                color: on ? '#40b5fa' : '#6b8fa0',
                border: `1px solid ${on ? 'rgba(64,181,250,0.35)' : 'rgba(0,40,80,0.08)'}`,
              }}>
              <Icon className="w-4 h-4" />{v.label}
            </button>
          )
        })}
      </div>

      {vista === 'fechas' ? (
        <FechasClave tasks={scoped} />
      ) : (
      <>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { key: 'pendiente',   value: counts.pendiente },
          { key: 'en_progreso', value: counts.en_progreso },
          { key: 'vencida',     value: counts.vencida },
          { key: 'completada',  value: counts.completada },
        ].map(s => {
          const m = STATUS_META[s.key]
          const active = peek === s.key
          return (
            <button key={s.key} onClick={() => setPeek(active ? null : s.key)}
              className="rounded-xl px-3 py-3 text-center transition-all hover:-translate-y-0.5"
              style={{
                background: active ? m.bg : '#ffffff',
                border: `1px solid ${active ? m.color + '55' : 'rgba(0,40,80,0.08)'}`,
                boxShadow: active ? `0 4px 14px ${m.color}22` : 'none',
                cursor: 'pointer',
              }}>
              <div className="text-2xl font-black" style={{ color: m.color }}>{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#6b8fa0' }}>{m.label}</div>
            </button>
          )
        })}
      </div>

      {/* Búsqueda + orden */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center flex-1 gap-2 rounded-xl px-3.5 py-2.5"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.10)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: '#86a2b2' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tarea por título, descripción o cliente…"
            className="flex-1 text-sm outline-none bg-transparent" style={{ color: '#1a2e3b' }} />
          {search && (
            <button onClick={() => setSearch('')} title="Limpiar búsqueda"
              className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity" style={{ color: '#6b8fa0' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)' }}>
          <ArrowDownUp className="w-4 h-4 flex-shrink-0" style={{ color: '#86a2b2' }} />
          <select value={sort} onChange={e => setSort(e.target.value as SortId)}
            className="text-sm outline-none bg-transparent font-medium cursor-pointer" style={{ color: '#1a2e3b' }}>
            {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['todas', 'pendiente', 'en_progreso', 'vencida', 'completada'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
            style={{
              background: status === s ? 'rgba(64,181,250,0.15)' : '#f4f7fa',
              color: status === s ? '#40b5fa' : '#6b8fa0',
              border: `1px solid ${status === s ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            {s.replace('_', ' ')}
          </button>
        ))}

        <div className="w-px" style={{ background: 'rgba(0,40,80,0.10)' }} />

        {['todas', 'critica', 'alta', 'media', 'baja'].map(p => (
          <button key={p} onClick={() => setPrioridad(p)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
            style={{
              background: prioridad === p ? `${pColors[p] ?? '#40b5fa'}20` : '#f4f7fa',
              color: prioridad === p ? (pColors[p] ?? '#40b5fa') : '#6b8fa0',
              border: `1px solid ${prioridad === p ? `${pColors[p] ?? '#40b5fa'}40` : 'rgba(0,40,80,0.08)'}`,
            }}>
            {p}
          </button>
        ))}

        <div className="w-px" style={{ background: 'rgba(0,40,80,0.10)' }} />

        {[
          { id: 'todas', label: 'Todas' },
          { id: 'recurrente', label: '↻ Recurrentes' },
          { id: 'esporadica', label: 'Esporádicas' },
        ].map(t => (
          <button key={t.id} onClick={() => setTipo(t.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tipo === t.id ? 'rgba(52,211,153,0.15)' : '#f4f7fa',
              color: tipo === t.id ? '#059669' : '#6b8fa0',
              border: `1px solid ${tipo === t.id ? 'rgba(52,211,153,0.35)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            {t.label}
          </button>
        ))}

        {isAdmin && <div className="w-px" style={{ background: 'rgba(0,40,80,0.10)' }} />}

        {isAdmin && [{ id: 'todas', full_name: 'Todos' }, ...profiles].map(p => {
          const isTodos = p.id === 'todas'
          const initials = isTodos ? '' : p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          return (
            <button key={p.id} onClick={() => setAsignado(p.id)}
              className={`inline-flex items-center gap-1.5 ${isTodos ? 'px-3' : 'pl-1.5 pr-3'} py-1.5 rounded-xl text-xs font-semibold transition-all`}
              style={{
                background: asignado === p.id ? 'rgba(167,139,250,0.15)' : '#f4f7fa',
                color: asignado === p.id ? '#a78bfa' : '#6b8fa0',
                border: `1px solid ${asignado === p.id ? 'rgba(167,139,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
              }}>
              {!isTodos && (
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(64,181,250,0.2)', color: '#40b5fa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                  {initials}
                </span>
              )}
              {p.full_name}
            </button>
          )
        })}
      </div>

      <TareasList
        tasks={[...filtered, ...tasks.filter(t => t.parent_id)]}
        profiles={profiles}
        companies={companies}
        onRefresh={refreshTasks}
      />
      </>
      )}

      {peek && (
        <KpiPeek
          statusKey={peek}
          tasks={scoped.filter(t => effectiveStatus(t) === peek)}
          onClose={() => setPeek(null)}
          onGoToList={() => { setStatus(peek); setVista('lista'); setPeek(null) }}
        />
      )}
    </div>
  )
}

// Panel lateral tipo Notion: se abre a la derecha al tocar un KPI y lista
// las tareas de ese estado. Solo lectura + atajo para verlas en la lista.
function KpiPeek({
  statusKey, tasks, onClose, onGoToList,
}: {
  statusKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[]
  onClose: () => void
  onGoToList: () => void
}) {
  const m = STATUS_META[statusKey]
  const ordenadas = [...tasks].sort((a, b) => (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#eef2f7' }}>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
            <h2 className="font-bold text-base" style={{ color: '#1a2e3b' }}>{m.label}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>
              {tasks.length}
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {ordenadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Check className="w-10 h-10 mb-3" style={{ color: '#cfd9e3' }} />
              <p className="text-sm font-medium" style={{ color: '#6b8fa0' }}>Nada por acá</p>
            </div>
          ) : ordenadas.map(t => {
            const clientes = taskCompanyNames(t)
            const asignados = assigneeNamesOf(t)
            const days = t.due_date ? daysUntil(t.due_date) : 0
            const isRec = t.task_type === 'recurrente'
            return (
              <div key={t.id} className="rounded-xl px-3.5 py-3 transition-colors"
                style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.06)' }}>
                <p className="text-sm font-medium mb-1" style={{ color: '#1a2e3b' }}>{t.title}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: '#6b8fa0' }}>
                  {clientes.length > 0 && <span>{clientes.length === 1 ? clientes[0] : `${clientes.length} clientes`}</span>}
                  {asignados.length > 0 && <span>· {asignados.length === 1 ? asignados[0] : `${asignados[0]} +${asignados.length - 1}`}</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: m.color }}>
                  {statusKey === 'vencida'
                    ? <><AlertTriangle className="w-3 h-3" />{Math.abs(days)}d vencida</>
                    : statusKey === 'completada'
                      ? <><Check className="w-3 h-3" />Completada</>
                      : statusKey === 'en_progreso'
                        ? <><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: m.color }} />En progreso</>
                        : isRec
                          ? <><RefreshIcon className="w-3 h-3" />Próx: {formatDate(t.due_date)}</>
                          : <><Clock className="w-3 h-3" />{days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : formatDate(t.due_date)}</>
                  }
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {ordenadas.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: '#eef2f7' }}>
            <button onClick={onGoToList}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: m.bg, color: m.color }}>
              Ver en la lista <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
