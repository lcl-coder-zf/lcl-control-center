'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, ListChecks, CalendarClock } from 'lucide-react'
import TareasList from './TareasList'
import FechasClave from './FechasClave'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'

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
    return scoped.filter(t => {
      const matchStatus = status === 'todas' || t.status === status
      const matchPrioridad = prioridad === 'todas' || t.priority === prioridad
      const matchAsignado = asignado === 'todas'
        || t.assigned_to === asignado
        || (t.task_assignees ?? []).some((a: any) => a.profile_id === asignado)
      const matchTipo = tipo === 'todas' || (tipo === 'recurrente' ? t.task_type === 'recurrente' : t.task_type !== 'recurrente')
      return matchStatus && matchPrioridad && matchAsignado && matchTipo
    })
  }, [scoped, status, prioridad, asignado, tipo])

  const counts = {
    pendiente:   scoped.filter(t => t.status === 'pendiente').length,
    en_progreso: scoped.filter(t => t.status === 'en_progreso').length,
    vencida:     scoped.filter(t => t.status === 'vencida' && t.task_type !== 'recurrente').length,
    completada:  scoped.filter(t => t.status === 'completada').length,
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
          { label: 'Pendientes', value: counts.pendiente, color: '#40b5fa' },
          { label: 'En progreso', value: counts.en_progreso, color: '#a78bfa' },
          { label: 'Vencidas', value: counts.vencida, color: '#ff6b6b' },
          { label: 'Completadas', value: counts.completada, color: '#4ade80' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-3 text-center"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#6b8fa0' }}>{s.label}</div>
          </div>
        ))}
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
    </div>
  )
}
