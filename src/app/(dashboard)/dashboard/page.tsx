'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { daysUntil } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import {
  Building2, FolderKanban, AlertTriangle, CalendarClock,
  TrendingUp, Users, CheckCircle2,
} from 'lucide-react'
import { DashboardSkeleton } from '@/components/ui/Skeleton'

const PRIORITY_COLOR: Record<string, string> = {
  baja: '#4ade80', media: '#ffd93d', alta: '#fb923c', critica: '#ff6b6b',
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    Promise.all([
      supabase.from('companies').select('id', { count: 'exact' }).eq('status', 'activo'),
      supabase.from('projects').select('id, name, progress').eq('status', 'activo').order('progress', { ascending: true }),
      supabase.from('tasks')
        .select('id, title, due_date, priority')
        .neq('status', 'completada')
        .lt('due_date', today)
        .order('due_date')
        .limit(8),
      supabase.from('tasks')
        .select('id, title, due_date, priority')
        .neq('status', 'completada')
        .gte('due_date', today)
        .lte('due_date', nextWeek)
        .order('due_date')
        .limit(8),
      supabase.from('profiles').select('id, full_name, email, role'),
    ]).then(([clientes, proyectos, atrasadas, proximas, perfiles]) => {
      setData({
        totalClientes: clientes.count ?? 0,
        proyectos: proyectos.data ?? [],
        tareasAtrasadas: atrasadas.data ?? [],
        tareasProximas: proximas.data ?? [],
        profiles: perfiles.data ?? [],
      })
    })
  }, [])

  if (!data) return <DashboardSkeleton />

  const avgProgress = data.proyectos.length > 0
    ? Math.round(data.proyectos.reduce((acc: number, p: any) => acc + (p.progress ?? 0), 0) / data.proyectos.length)
    : 0

  const kpis = [
    { label: 'Clientes activos',   value: data.totalClientes,          icon: Building2,     color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
    { label: 'Proyectos activos',  value: data.proyectos.length,       icon: FolderKanban,  color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
    { label: 'Avance promedio',    value: `${avgProgress}%`,           icon: TrendingUp,    color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
    { label: 'Tareas atrasadas',   value: data.tareasAtrasadas.length, icon: AlertTriangle, color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
    { label: 'Vencen esta semana', value: data.tareasProximas.length,  icon: CalendarClock, color: '#ffd93d', bg: 'rgba(255,217,61,0.10)' },
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-3xl font-black mb-1" style={{ color, lineHeight: 1 }}>{value}</div>
            <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#6b8fa0' }}>{label}</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tareas atrasadas */}
        <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: '#1a2e3b' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#ff6b6b' }} />Tareas atrasadas
          </h3>
          {data.tareasAtrasadas.length > 0 ? (
            <div className="space-y-2">
              {data.tareasAtrasadas.map((t: any) => {
                const dias = Math.abs(daysUntil(t.due_date))
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.12)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_COLOR[t.priority] ?? '#ffd93d' }} />
                      <span className="text-sm truncate" style={{ color: '#1a2e3b' }}>{t.title}</span>
                    </div>
                    <span className="text-xs flex-shrink-0 ml-2 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,107,107,0.15)', color: '#ff6b6b' }}>
                      {dias === 0 ? 'Hoy' : `${dias}d atrás`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 className="w-8 h-8 mb-2" style={{ color: '#4ade80' }} />
              <p className="text-sm" style={{ color: '#6b8fa0' }}>Sin tareas atrasadas</p>
            </div>
          )}
        </div>

        {/* Próximas esta semana */}
        <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: '#1a2e3b' }}>
            <CalendarClock className="w-4 h-4" style={{ color: '#ffd93d' }} />Vencen esta semana
          </h3>
          {data.tareasProximas.length > 0 ? (
            <div className="space-y-2">
              {data.tareasProximas.map((t: any) => {
                const dias = daysUntil(t.due_date)
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: 'rgba(255,217,61,0.04)', border: '1px solid rgba(255,217,61,0.15)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_COLOR[t.priority] ?? '#ffd93d' }} />
                      <span className="text-sm truncate" style={{ color: '#1a2e3b' }}>{t.title}</span>
                    </div>
                    <span className="text-xs flex-shrink-0 ml-2 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,217,61,0.15)', color: '#b89c00' }}>
                      {dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: '#6b8fa0' }}>Sin tareas esta semana</p>
          )}
        </div>
      </div>

      {/* Progreso de proyectos */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-5" style={{ color: '#1a2e3b' }}>
          <FolderKanban className="w-4 h-4" style={{ color: '#40b5fa' }} />Estado de proyectos
        </h3>
        {data.proyectos.length > 0 ? (
          <div className="space-y-3">
            {data.proyectos.slice(0, 12).map((p: any) => {
              const pct = p.progress ?? 0
              const barColor = pct < 30 ? '#ff6b6b' : pct < 70 ? '#ffd93d' : '#4ade80'
              return (
                <div key={p.id} className="flex items-center gap-4">
                  <span className="text-sm truncate flex-1" style={{ color: '#1a2e3b', minWidth: 0 }}>{p.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-36 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right tabular-nums" style={{ color: '#6b8fa0' }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: '#6b8fa0' }}>Sin proyectos activos</p>
        )}
      </div>

      {/* Equipo */}
      <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: '#1a2e3b' }}>
          <Users className="w-4 h-4" style={{ color: '#40b5fa' }} />Equipo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.profiles.map((p: any) => {
            const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            const roleLabel = ROLE_LABELS[p.email] ?? (p.role === 'admin' ? 'Administrador' : 'Consultor')
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-3"
                style={{ background: 'rgba(64,181,250,0.04)', border: '1px solid rgba(64,181,250,0.12)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                  <p className="text-xs truncate" style={{ color: '#6b8fa0' }}>{roleLabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
