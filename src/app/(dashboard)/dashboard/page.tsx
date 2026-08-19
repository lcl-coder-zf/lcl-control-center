'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, formatDate } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import {
  RECURRENCE_CONFIG, regenerateIfRecurring, type Recurrence,
  taskCompanyIds, taskCompanyNames,
} from '@/lib/tasks'
import {
  Building2, AlertTriangle, CalendarClock,
  Users, CheckCircle2, CheckSquare, Circle,
  Clock, RefreshCw, Loader2, ArrowRight,
} from 'lucide-react'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import EmployeePanel from '@/components/equipo/EmployeePanel'
import KpiPanel, { type KpiItem } from '@/components/dashboard/KpiPanel'

const PRIORITY = {
  baja:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', label: 'Baja' },
  media:   { color: '#ffd93d', bg: 'rgba(255,217,61,0.10)', label: 'Media' },
  alta:    { color: '#fb923c', bg: 'rgba(251,146,60,0.10)', label: 'Alta' },
  critica: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', label: 'Crítica' },
}

const TASK_SELECT = '*, companies(id, name), projects(id, name), profiles!tasks_assigned_to_fkey(id, full_name), task_assignees(profile_id), task_companies(company_id, companies(id, name))'

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [openKpi, setOpenKpi] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [clientes, tareas, perfiles, myProfile] = await Promise.all([
      supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
      supabase.from('tasks').select(TASK_SELECT).is('parent_id', null).order('due_date', { ascending: true }),
      supabase.from('profiles').select('id, full_name, email, role, bio, start_date, phone').order('full_name'),
      user ? supabase.from('profiles').select('role').eq('id', user.id).single() : Promise.resolve({ data: null }),
    ])
    setData({
      clientes: clientes.data ?? [],
      allTasks: tareas.data ?? [],
      profiles: perfiles.data ?? [],
      currentUserRole: myProfile.data?.role ?? 'consultant',
      currentUserId: user?.id ?? null,
    })
  }, [])

  useEffect(() => { load() }, [load])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function markComplete(task: any) {
    setCompleting(task.id)
    const supabase = createClient()
    await supabase.from('tasks').update({ status: 'completada', completed_at: new Date().toISOString() }).eq('id', task.id)
    await regenerateIfRecurring(supabase, task)
    await load()
    setCompleting(null)
  }

  if (!data) return <DashboardSkeleton />

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = data.allTasks.filter((t: any) => t.status !== 'completada')
  // Las tareas del usuario logueado van de primero en "Tareas por hacer"; el resto
  // conserva su orden por fecha (sort estable).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esMia = (t: any) => t.assigned_to === data.currentUserId
    || (t.task_assignees ?? []).some((a: any) => a.profile_id === data.currentUserId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeOrdenada = [...active].sort((a: any, b: any) => (esMia(a) ? 0 : 1) - (esMia(b) ? 0 : 1))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const atrasadas = active.filter((t: any) => daysUntil(t.due_date) < 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hoy = active.filter((t: any) => daysUntil(t.due_date) === 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const semana = active.filter((t: any) => { const d = daysUntil(t.due_date); return d > 0 && d <= 7 })

  // Tareas por cliente = ranking por carga de tareas activas (pendientes).
  // Una tarea compartida entre varios clientes suma en cada uno de ellos.
  const clientesCarga = data.clientes.map((c: { id: string; name: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ts = active.filter((t: any) => taskCompanyIds(t).includes(c.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdue = ts.filter((t: any) => daysUntil(t.due_date) < 0).length
    return { id: c.id, name: c.name, count: ts.length, overdue }
  }).filter((c: { count: number }) => c.count > 0)
    .sort((a: { count: number; name: string }, b: { count: number; name: string }) =>
      b.count - a.count || a.name.localeCompare(b.name))
  const maxCarga = clientesCarga.length > 0 ? clientesCarga[0].count : 0

  // Tareas completadas en los últimos 7 días.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completadas7dList = data.allTasks.filter((t: any) => {
    if (t.status !== 'completada' || !t.completed_at) return false
    const d = daysUntil(t.completed_at)
    return d <= 0 && d >= -7
  })

  const kpis = [
    { key: 'clientes',   label: 'Clientes activos',   value: data.clientes.length,       icon: Building2,     color: '#40b5fa' },
    { key: 'completadas', label: 'Completadas (7d)',  value: completadas7dList.length,   icon: CheckCircle2,  color: '#4ade80' },
    { key: 'porhacer',   label: 'Por hacer',          value: active.length,              icon: CheckSquare,   color: '#a78bfa' },
    { key: 'atrasadas',  label: 'Atrasadas',          value: atrasadas.length,           icon: AlertTriangle, color: '#ff6b6b' },
    { key: 'semana',     label: 'Vencen esta semana', value: hoy.length + semana.length, icon: CalendarClock, color: '#ffd93d' },
  ]
  const openKpiMeta = kpis.find(k => k.key === openKpi)

  // Detalle (lista) de cada KPI para el panel lateral tipo Notion.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subOf = (t: any) => [t.profiles?.full_name, taskCompanyNames(t)[0]].filter(Boolean).join(' · ') || undefined
  function buildKpiItems(key: string): KpiItem[] {
    if (key === 'clientes') {
      return data.clientes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: { id: string; name: string }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const n = active.filter((t: any) => taskCompanyIds(t).includes(c.id)).length
          return { id: c.id, title: c.name, subtitle: n ? `${n} tarea${n !== 1 ? 's' : ''} activa${n !== 1 ? 's' : ''}` : 'Sin tareas activas', href: `/clientes/${c.id}` }
        })
        .sort((a: KpiItem, b: KpiItem) => a.title.localeCompare(b.title))
    }
    if (key === 'completadas') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [...completadas7dList].sort((a: any, b: any) => +new Date(b.completed_at) - +new Date(a.completed_at))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({ id: t.id, title: t.title, subtitle: subOf(t), meta: formatDate(t.completed_at), metaColor: '#4ade80' }))
    }
    if (key === 'porhacer') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return active.map((t: any) => {
        const d = daysUntil(t.due_date)
        return {
          id: t.id, title: t.title, subtitle: subOf(t),
          meta: d < 0 ? `${Math.abs(d)}d` : d === 0 ? 'Hoy' : formatDate(t.due_date),
          metaColor: d < 0 ? '#ff6b6b' : d <= 2 ? '#fb923c' : '#6b8fa0',
        }
      })
    }
    if (key === 'atrasadas') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [...atrasadas].sort((a: any, b: any) => daysUntil(a.due_date) - daysUntil(b.due_date))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({ id: t.id, title: t.title, subtitle: subOf(t), meta: `${Math.abs(daysUntil(t.due_date))}d`, metaColor: '#ff6b6b' }))
    }
    if (key === 'semana') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [...hoy, ...semana].sort((a: any, b: any) => daysUntil(a.due_date) - daysUntil(b.due_date))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => {
          const d = daysUntil(t.due_date)
          return { id: t.id, title: t.title, subtitle: subOf(t), meta: d === 0 ? 'Hoy' : `${d}d`, metaColor: d === 0 ? '#e0b800' : '#6b8fa0' }
        })
    }
    return []
  }

  return (
    <>
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Vista gerencial</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>
          {new Intl.DateTimeFormat('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
        </p>
      </div>

      {/* KPIs — clickeables, abren panel lateral con el detalle */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {kpis.map(({ key, label, value, icon: Icon, color }) => (
          <button key={key} onClick={() => setOpenKpi(key)}
            className="text-left rounded-2xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-2xl font-black mb-0.5" style={{ color, lineHeight: 1 }}>{value}</div>
            <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#6b8fa0' }}>{label}</div>
            <ArrowRight className="w-3.5 h-3.5 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Tareas por hacer — el corazón del dashboard */}
        <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#1a2e3b' }}>
              <CheckSquare className="w-4 h-4" style={{ color: '#40b5fa' }} />
              Tareas por hacer
              {active.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>{active.length}</span>
              )}
            </h3>
            <Link href="/tareas" className="text-xs font-semibold flex items-center gap-1" style={{ color: '#40b5fa' }}>
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {active.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <CheckCircle2 className="w-10 h-10 mb-3" style={{ color: '#4ade80' }} />
              <p className="text-sm font-semibold" style={{ color: '#1a2e3b' }}>Todo al día</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b8fa0' }}>No hay tareas pendientes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {activeOrdenada.slice(0, 12).map((t: any) => {
                const days = daysUntil(t.due_date)
                const isVencida = days < 0
                const isHoy = days === 0
                const isUrgente = days > 0 && days <= 2
                const pr = PRIORITY[t.priority as keyof typeof PRIORITY] ?? PRIORITY.media
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                    style={{
                      background: isVencida ? 'rgba(255,107,107,0.05)' : isHoy ? 'rgba(255,217,61,0.05)' : '#fafbfc',
                      border: `1px solid ${isVencida ? 'rgba(255,107,107,0.18)' : isHoy ? 'rgba(255,217,61,0.25)' : 'rgba(0,40,80,0.06)'}`,
                    }}>
                    {/* Check rápido */}
                    <button onClick={() => markComplete(t)} disabled={completing === t.id}
                      title="Marcar completada" className="flex-shrink-0">
                      {completing === t.id
                        ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#40b5fa' }} />
                        : <Circle className="w-5 h-5" style={{ color: '#86a2b2' }} />}
                    </button>

                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: pr.color }} />

                    <Link href="/tareas" className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{t.title}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {t.task_type === 'recurrente' && t.recurrence && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
                            style={{ background: 'rgba(52,211,153,0.10)', color: '#059669' }}>
                            <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_CONFIG[t.recurrence as Recurrence]?.short ?? 'Rec'}
                          </span>
                        )}
                        {taskCompanyNames(t).length > 0 && (
                          <span className="text-[11px]" style={{ color: '#6b8fa0' }}>
                            {taskCompanyNames(t).join(' · ')}
                          </span>
                        )}
                        {t.profiles?.full_name && <span className="text-[11px]" style={{ color: '#86a2b2' }}>→ {t.profiles.full_name}</span>}
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 text-xs flex-shrink-0"
                      style={{ color: isVencida ? '#ff6b6b' : isHoy ? '#b89c00' : isUrgente ? '#fb923c' : '#86a2b2' }}>
                      {isVencida
                        ? <><AlertTriangle className="w-3 h-3" />{Math.abs(days)}d</>
                        : <><Clock className="w-3 h-3" />{isHoy ? 'Hoy' : days === 1 ? 'Mañana' : formatDate(t.due_date)}</>}
                    </div>
                  </div>
                )
              })}
              {active.length > 12 && (
                <Link href="/tareas" className="block text-center text-xs font-semibold py-2 rounded-xl mt-1"
                  style={{ background: '#f4f7fa', color: '#40b5fa' }}>
                  +{active.length - 12} tareas más
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Equipo */}
        <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: '#1a2e3b' }}>
            <Users className="w-4 h-4" style={{ color: '#40b5fa' }} />Equipo
          </h3>
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.profiles.map((p: any) => {
              const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const roleLabel = ROLE_LABELS[p.email] ?? (p.role === 'admin' ? 'Administrador' : 'Consultor')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const asignadas = active.filter((t: any) => t.assigned_to === p.id).length
              return (
                <button key={p.id} onClick={() => setSelectedEmployee(p)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left"
                  style={{ background: 'rgba(64,181,250,0.04)', border: '1px solid rgba(64,181,250,0.10)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(64,181,250,0.09)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(64,181,250,0.04)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                    <p className="text-[11px] truncate" style={{ color: '#6b8fa0' }}>{roleLabel}</p>
                  </div>
                  {asignadas > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>{asignadas}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tareas por cliente — ranking por carga activa */}
      <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-5" style={{ color: '#1a2e3b' }}>
          <Building2 className="w-4 h-4" style={{ color: '#40b5fa' }} />Tareas por cliente
        </h3>
        {clientesCarga.length > 0 ? (
          <div className="space-y-3">
            {clientesCarga.slice(0, 20).map((c: { id: string; name: string; count: number; overdue: number }) => {
              const pct = maxCarga > 0 ? Math.round((c.count / maxCarga) * 100) : 0
              const barColor = c.overdue > 0 ? '#ff6b6b' : '#40b5fa'
              return (
                <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-4 group">
                  <span className="text-sm truncate flex-1 group-hover:underline" style={{ color: '#1a2e3b', minWidth: 0 }}>{c.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-36 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="text-xs font-semibold w-14 text-right tabular-nums flex items-center justify-end gap-1" style={{ color: '#6b8fa0' }}>
                      {c.overdue > 0 && <AlertTriangle className="w-3 h-3" style={{ color: '#ff6b6b' }} />}
                      {c.count}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: '#6b8fa0' }}>Sin tareas activas</p>
        )}
      </div>
    </div>

      {selectedEmployee && (
        <EmployeePanel
          profile={selectedEmployee}
          currentUserRole={data?.currentUserRole ?? 'consultant'}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {openKpi && openKpiMeta && (
        <KpiPanel
          label={openKpiMeta.label}
          value={openKpiMeta.value}
          color={openKpiMeta.color}
          Icon={openKpiMeta.icon}
          items={buildKpiItems(openKpi)}
          emptyText="Nada por aquí 🎉"
          onClose={() => setOpenKpi(null)}
        />
      )}
    </>
  )
}
