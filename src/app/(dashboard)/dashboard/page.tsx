'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, daysUntil } from '@/lib/utils'
import { Building2, FolderKanban, AlertTriangle, CalendarClock, DollarSign, TrendingUp, Users } from 'lucide-react'
import { DashboardSkeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('companies').select('id', { count: 'exact' }).eq('status', 'activo'),
      supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'activo'),
      supabase.from('tasks').select('id, title, due_date, priority').eq('status', 'vencida').limit(5),
      supabase.from('calendar_events').select('id, title, due_date, type').eq('status', 'pendiente')
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true }).limit(5),
      supabase.from('projects').select('value, paid').eq('status', 'activo'),
      supabase.from('projects').select('id, name').eq('status', 'activo').not('risks', 'is', null).limit(3),
      supabase.from('profiles').select('id, full_name, role'),
    ]).then(([activos, proyectos, vencidas, eventos, finanzas, riesgo, perfiles]) => {
      setData({
        totalClientes: activos.count ?? 0,
        totalProyectos: proyectos.count ?? 0,
        tareasVencidas: vencidas.data ?? [],
        eventosProximos: eventos.data ?? [],
        proyectosFinanzas: finanzas.data ?? [],
        proyectosRiesgo: riesgo.data ?? [],
        profiles: perfiles.data ?? [],
      })
    })
  }, [])

  if (!data) return <DashboardSkeleton />

  const porCobrar = data.proyectosFinanzas.reduce((acc: number, p: any) => acc + ((p.value ?? 0) - (p.paid ?? 0)), 0)

  const kpis = [
    { label: 'Clientes activos', value: data.totalClientes, icon: Building2, color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
    { label: 'Proyectos en curso', value: data.totalProyectos, icon: FolderKanban, color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
    { label: 'Tareas vencidas', value: data.tareasVencidas.length, icon: AlertTriangle, color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
    { label: 'Auditorías próximas', value: data.eventosProximos.filter((e: any) => e.type === 'auditoria').length, icon: CalendarClock, color: '#ffd93d', bg: 'rgba(255,217,61,0.10)' },
    { label: 'Por cobrar', value: formatCurrency(porCobrar), icon: DollarSign, color: '#40b5fa', bg: 'rgba(64,181,250,0.10)', isText: true },
    { label: 'Proyectos en riesgo', value: data.proyectosRiesgo.length, icon: TrendingUp, color: '#ffd93d', bg: 'rgba(255,217,61,0.10)' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Vista gerencial</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>
          {new Intl.DateTimeFormat('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color, bg, isText }) => (
          <div key={label} className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-3xl font-black mb-1" style={{ color, lineHeight: 1 }}>
              {isText ? <span className="text-xl">{value}</span> : value}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#6b8fa0' }}>{label}</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tareas vencidas */}
        <div className="rounded-2xl p-6"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: '#1a2e3b' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#ff6b6b' }} />Tareas vencidas
          </h3>
          {data.tareasVencidas.length > 0 ? (
            <div className="space-y-2">
              {data.tareasVencidas.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.15)' }}>
                  <span className="text-sm" style={{ color: '#1a2e3b' }}>{t.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,107,0.15)', color: '#ff6b6b' }}>
                    {Math.abs(daysUntil(t.due_date))}d atrás
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: '#6b8fa0' }}>Sin tareas vencidas</p>
          )}
        </div>

        {/* Próximos vencimientos */}
        <div className="rounded-2xl p-6"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: '#1a2e3b' }}>
            <CalendarClock className="w-4 h-4" style={{ color: '#ffd93d' }} />Próximos vencimientos
          </h3>
          {data.eventosProximos.length > 0 ? (
            <div className="space-y-2">
              {data.eventosProximos.map((ev: any) => {
                const days = daysUntil(ev.due_date)
                const urgent = days <= 7
                return (
                  <div key={ev.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: urgent ? 'rgba(255,217,61,0.06)' : '#fafbfc', border: `1px solid ${urgent ? 'rgba(255,217,61,0.2)' : 'rgba(0,40,80,0.08)'}` }}>
                    <div>
                      <p className="text-sm" style={{ color: '#1a2e3b' }}>{ev.title}</p>
                      <p className="text-xs capitalize" style={{ color: '#6b8fa0' }}>{ev.type}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: urgent ? 'rgba(255,217,61,0.15)' : 'rgba(64,181,250,0.10)', color: urgent ? '#ffd93d' : '#40b5fa' }}>
                      {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: '#6b8fa0' }}>Sin vencimientos próximos</p>
          )}
        </div>

        {/* Equipo */}
        <div className="rounded-2xl p-6 lg:col-span-2"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-4" style={{ color: '#1a2e3b' }}>
            <Users className="w-4 h-4" style={{ color: '#40b5fa' }} />Equipo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.profiles.map((p: any) => {
              const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-3"
                  style={{ background: 'rgba(64,181,250,0.04)', border: '1px solid rgba(64,181,250,0.12)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                    <p className="text-xs capitalize" style={{ color: '#6b8fa0' }}>
                      {p.role === 'admin' ? 'Directora' : 'Consultora'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
