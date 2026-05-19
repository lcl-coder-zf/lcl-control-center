'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, CalendarClock, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { daysUntil, formatDate } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  recertificacion: { label: 'Recertificación', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  auditoria:       { label: 'Auditoría',       color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  entrega:         { label: 'Entrega',          color: '#40b5fa', bg: 'rgba(64,181,250,0.12)'  },
  reporte:         { label: 'Reporte',          color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  vencimiento:     { label: 'Vencimiento',      color: '#ffd93d', bg: 'rgba(255,217,61,0.12)'  },
}

export default function CalendarioPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState('todos')
  const [vista, setVista] = useState<'proximos' | 'todos' | 'vencidos'>('proximos')

  useEffect(() => {
    fetchEvents()
  }, [])

  function fetchEvents() {
    const supabase = createClient()
    supabase
      .from('calendar_events')
      .select('*, companies(id, name), projects(id, name)')
      .order('due_date', { ascending: true })
      .then(({ data }) => {
        setEvents(data ?? [])
        setLoading(false)
      })
  }

  const filtered = useMemo(() => {
    return events.filter(ev => {
      const days = daysUntil(ev.due_date)
      const matchTipo = tipo === 'todos' || ev.type === tipo
      const matchVista =
        vista === 'todos' ? true :
        vista === 'proximos' ? (days >= 0 && ev.status !== 'completado') :
        vista === 'vencidos' ? (days < 0 || ev.status === 'vencido') :
        true
      return matchTipo && matchVista
    })
  }, [events, tipo, vista])

  const hoy     = events.filter(ev => daysUntil(ev.due_date) === 0 && ev.status === 'pendiente').length
  const semana  = events.filter(ev => { const d = daysUntil(ev.due_date); return d > 0 && d <= 7 && ev.status === 'pendiente' }).length
  const vencidos = events.filter(ev => daysUntil(ev.due_date) < 0 && ev.status !== 'completado').length
  const completados = events.filter(ev => ev.status === 'completado').length

  async function markComplete(id: string) {
    const supabase = createClient()
    await supabase.from('calendar_events').update({ status: 'completado' }).eq('id', id)
    fetchEvents()
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 04</p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Vencimientos</h1>
          <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>{events.length} evento{events.length !== 1 ? 's' : ''} registrado{events.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/calendario/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#40b5fa', color: '#ffffff' }}>
          <Plus className="w-4 h-4" />Nuevo vencimiento
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Vence hoy',   value: hoy,        color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
          { label: 'Esta semana', value: semana,      color: '#ffd93d', bg: 'rgba(255,217,61,0.10)'  },
          { label: 'Vencidos',    value: vencidos,    color: '#ff6b6b', bg: 'rgba(255,107,107,0.08)' },
          { label: 'Completados', value: completados, color: '#4ade80', bg: 'rgba(74,222,128,0.10)'  },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-3 text-center"
            style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#6b8fa0' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'proximos', label: 'Próximos' },
          { key: 'todos',    label: 'Todos'    },
          { key: 'vencidos', label: 'Vencidos' },
        ].map(v => (
          <button key={v.key} onClick={() => setVista(v.key as any)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: vista === v.key ? 'rgba(64,181,250,0.15)' : '#f4f7fa',
              color: vista === v.key ? '#40b5fa' : '#6b8fa0',
              border: `1px solid ${vista === v.key ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            {v.label}
          </button>
        ))}

        <div className="w-px" style={{ background: 'rgba(0,40,80,0.10)' }} />

        {['todos', ...Object.keys(TYPE_CONFIG)].map(t => {
          const cfg = TYPE_CONFIG[t]
          return (
            <button key={t} onClick={() => setTipo(t)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: tipo === t ? (cfg ? cfg.bg : 'rgba(64,181,250,0.12)') : '#f4f7fa',
                color: tipo === t ? (cfg ? cfg.color : '#40b5fa') : '#6b8fa0',
                border: `1px solid ${tipo === t ? (cfg ? cfg.color + '40' : 'rgba(64,181,250,0.3)') : 'rgba(0,40,80,0.08)'}`,
              }}>
              {cfg?.label ?? 'Todos'}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <CalendarClock className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin eventos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ev => {
            const days = daysUntil(ev.due_date)
            const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.vencimiento
            const isVencido = days < 0 && ev.status !== 'completado'
            const isHoy = days === 0
            const isUrgente = days > 0 && days <= 7
            const isCompleto = ev.status === 'completado'

            let borderColor = 'rgba(0,40,80,0.08)'
            let bgColor = '#ffffff'
            if (isCompleto)  { borderColor = 'rgba(74,222,128,0.15)'; bgColor = 'rgba(74,222,128,0.04)' }
            else if (isVencido) { borderColor = 'rgba(255,107,107,0.25)'; bgColor = 'rgba(255,107,107,0.05)' }
            else if (isHoy)     { borderColor = 'rgba(255,107,107,0.3)';  bgColor = 'rgba(255,107,107,0.06)' }
            else if (isUrgente) { borderColor = 'rgba(255,217,61,0.25)';  bgColor = 'rgba(255,217,61,0.04)' }

            return (
              <div key={ev.id} className="rounded-2xl px-5 py-4 flex items-center gap-4 transition-all"
                style={{ background: bgColor, border: `1px solid ${borderColor}`, opacity: isCompleto ? 0.65 : 1 }}>

                {/* Tipo */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[9px] font-black text-center leading-tight"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                  {cfg.label.slice(0, 3).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-0.5" style={{ color: '#1a2e3b', textDecoration: isCompleto ? 'line-through' : 'none' }}>
                    {ev.title}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {ev.companies?.name && (
                      <span className="text-xs" style={{ color: '#6b8fa0' }}>{ev.companies.name}</span>
                    )}
                    {ev.projects?.name && (
                      <span className="text-xs" style={{ color: '#6b8fa0' }}>· {ev.projects.name}</span>
                    )}
                  </div>
                  {/* Alertas */}
                  <div className="flex gap-2 mt-2">
                    {[{ active: ev.alert_15, label: '15d' }, { active: ev.alert_7, label: '7d' }, { active: ev.alert_1, label: '1d' }].map(a => (
                      <span key={a.label} className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: a.active ? 'rgba(64,181,250,0.12)' : '#f4f7fa', color: a.active ? '#40b5fa' : '#6b8fa060' }}>
                        ⏰ {a.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Fecha y acción */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold"
                      style={{ color: isVencido || isHoy ? '#ff6b6b' : isUrgente ? '#ffd93d' : '#1a2e3b' }}>
                      {isCompleto ? '✓ Listo' :
                       isHoy ? 'HOY' :
                       isVencido ? `${Math.abs(days)}d vencido` :
                       days === 1 ? 'Mañana' :
                       `${days}d`}
                    </p>
                    <p className="text-xs" style={{ color: '#6b8fa0' }}>{formatDate(ev.due_date)}</p>
                  </div>

                  {!isCompleto && (
                    <button onClick={() => markComplete(ev.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                      title="Marcar como completado">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
