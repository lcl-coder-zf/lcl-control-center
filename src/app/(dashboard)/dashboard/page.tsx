'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, formatDate } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import { RECURRENCE_CONFIG, regenerateIfRecurring, type Recurrence } from '@/lib/tasks'
import {
  Building2, AlertTriangle, CalendarClock,
  TrendingUp, Users, CheckCircle2, CheckSquare, Circle,
  Clock, RefreshCw, Loader2, ArrowRight,
} from 'lucide-react'
import { DashboardSkeleton } from '@/components/ui/Skeleton'

const PRIORITY = {
  baja:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', label: 'Baja' },
  media:   { color: '#ffd93d', bg: 'rgba(255,217,61,0.10)', label: 'Media' },
  alta:    { color: '#fb923c', bg: 'rgba(251,146,60,0.10)', label: 'Alta' },
  critica: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', label: 'Crítica' },
}

const TASK_SELECT = '*, companies(id, name), projects(id, name), profiles!tasks_assigned_to_fkey(id, full_name)'

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [clientes, tareas, perfiles] = await Promise.all([
      supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
      // Todas las tareas principales (para lista activa + avance por cliente).
      supabase.from('tasks').select(TASK_SELECT).is('parent_id', null).order('due_date', { ascending: true }),
      supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
    ])
    setData({
      clientes: clientes.data ?? [],
      allTasks: tareas.data ?? [],
      profiles: perfiles.data ?? [],
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const atrasadas = active.filter((t: any) => daysUntil(t.due_date) < 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hoy = active.filter((t: any) => daysUntil(t.due_date) === 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const semana = active.filter((t: any) => { const d = daysUntil(t.due_date); return d > 0 && d <= 7 })

  // Avance por cliente = % de tareas principales completadas de ese cliente.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientesProgreso = data.clientes.map((c: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ts = data.allTasks.filter((t: any) => t.company_id === c.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const done = ts.filter((t: any) => t.status === 'completada').length
    const progress = ts.length > 0 ? Math.round((done / ts.length) * 100) : 0
    return { ...c, progress, total: ts.length }
  }).sort((a: { total: number; name: string }, b: { total: number; name: string }) =>
    // Primero los que tienen tareas; luego alfabético.
    (b.total > 0 ? 1 : 0) - (a.total > 0 ? 1 : 0) || a.name.localeCompare(b.name))

  const conTareas = clientesProgreso.filter((c: { total: number }) => c.total > 0)
  const avgProgress = conTareas.length > 0
    ? Math.round(conTareas.reduce((acc: number, c: { progress: number }) => acc + c.progress, 0) / conTareas.length)
    : 0

  const kpis = [
    { label: 'Clientes activos',   value: data.clientes.length,    icon: Building2,     color: '#40b5fa' },
    { label: 'Avance promedio',    value: `${avgProgress}%`,       icon: TrendingUp,    color: '#4ade80' },
    { label: 'Por hacer',          value: active.length,           icon: CheckSquare,   color: '#a78bfa' },
    { label: 'Atrasadas',          value: atrasadas.length,        icon: AlertTriangle, color: '#ff6b6b' },
    { label: 'Vencen esta semana', value: hoy.length + semana.length, icon: CalendarClock, color: '#ffd93d' },
  ]

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Vista gerencial</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>
          {new Intl.DateTimeFormat('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-2xl font-black mb-0.5" style={{ color, lineHeight: 1 }}>{value}</div>
            <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#6b8fa0' }}>{label}</div>
          </div>
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
              {active.slice(0, 12).map((t: any) => {
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
                        {t.companies?.name && <span className="text-[11px]" style={{ color: '#6b8fa0' }}>{t.companies.name}</span>}
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
                <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(64,181,250,0.04)', border: '1px solid rgba(64,181,250,0.10)' }}>
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
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Avance por cliente */}
      <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-5" style={{ color: '#1a2e3b' }}>
          <Building2 className="w-4 h-4" style={{ color: '#40b5fa' }} />Avance por cliente
        </h3>
        {clientesProgreso.length > 0 ? (
          <div className="space-y-3">
            {clientesProgreso.slice(0, 20).map((c: { id: string; name: string; progress: number; total: number }) => {
              const barColor = c.progress < 30 ? '#ff6b6b' : c.progress < 70 ? '#ffd93d' : '#4ade80'
              return (
                <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-4 group">
                  <span className="text-sm truncate flex-1 group-hover:underline" style={{ color: '#1a2e3b', minWidth: 0 }}>{c.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-36 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.progress}%`, background: barColor }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right tabular-nums" style={{ color: '#6b8fa0' }}>{c.progress}%</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: '#6b8fa0' }}>Sin clientes activos</p>
        )}
      </div>
    </div>
  )
}
