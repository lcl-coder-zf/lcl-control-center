'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Building2, BellRing, RefreshCw, AlertTriangle } from 'lucide-react'
import { daysUntil } from '@/lib/utils'
import { RECURRENCE_CONFIG, type Recurrence, avisoLabel, taskCompanyNames } from '@/lib/tasks'

// Vista de fechas clave: en vez de ir al calendario a buscar qué se viene,
// lista los vencimientos abiertos agrupados por mes, con el cliente al frente.
// Pensada para las obligaciones anuales (ej: 31 de marzo, documentación).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const parseLocal = (d: string) => new Date(d + 'T12:00:00')

type Horizonte = 3 | 6 | 12 | 0 // 0 = sin límite

export default function FechasClave({ tasks }: { tasks: Row[] }) {
  const [soloRecurrentes, setSoloRecurrentes] = useState(false)
  const [horizonte, setHorizonte] = useState<Horizonte>(12)

  const { vencidas, meses } = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = horizonte === 0
      ? null
      : new Date(hoy.getFullYear(), hoy.getMonth() + horizonte, hoy.getDate())

    const abiertas = tasks.filter((t: Row) => {
      if (t.status === 'completada' || !t.due_date) return false
      if (soloRecurrentes && t.task_type !== 'recurrente') return false
      return true
    })

    const porFecha = (a: Row, b: Row) => String(a.due_date).localeCompare(String(b.due_date))

    const vencidas = abiertas.filter((t: Row) => daysUntil(t.due_date) < 0).sort(porFecha)

    const futuras = abiertas
      .filter((t: Row) => {
        if (daysUntil(t.due_date) < 0) return false
        return limite ? parseLocal(t.due_date) <= limite : true
      })
      .sort(porFecha)

    // Agrupadas por mes, conservando el orden cronológico.
    const porMes = new Map<string, Row[]>()
    for (const t of futuras) {
      const key = String(t.due_date).slice(0, 7) // YYYY-MM
      const lista = porMes.get(key) ?? []
      lista.push(t)
      porMes.set(key, lista)
    }

    return { vencidas, meses: [...porMes.entries()] }
  }, [tasks, soloRecurrentes, horizonte])

  const total = vencidas.length + meses.reduce((n, [, ts]) => n + ts.length, 0)

  const HORIZONTES: { v: Horizonte; label: string }[] = [
    { v: 3,  label: '3 meses' },
    { v: 6,  label: '6 meses' },
    { v: 12, label: '1 año' },
    { v: 0,  label: 'Todo' },
  ]

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={() => setSoloRecurrentes(!soloRecurrentes)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: soloRecurrentes ? 'rgba(52,211,153,0.15)' : '#f4f7fa',
            color: soloRecurrentes ? '#059669' : '#6b8fa0',
            border: `1px solid ${soloRecurrentes ? 'rgba(52,211,153,0.35)' : 'rgba(0,40,80,0.08)'}`,
          }}>
          <RefreshCw className="w-3 h-3" />Solo recurrentes
        </button>

        <div className="w-px h-5" style={{ background: 'rgba(0,40,80,0.10)' }} />

        {HORIZONTES.map(o => (
          <button key={o.label} onClick={() => setHorizonte(o.v)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: horizonte === o.v ? 'rgba(64,181,250,0.15)' : '#f4f7fa',
              color: horizonte === o.v ? '#40b5fa' : '#6b8fa0',
              border: `1px solid ${horizonte === o.v ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <CalendarClock className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Nada a la vista en este periodo</p>
        </div>
      ) : (
        <div className="space-y-6">
          {vencidas.length > 0 && <Grupo titulo="Ya vencidas" color="#ff6b6b" tareas={vencidas} />}
          {meses.map(([key, ts]) => {
            const [anio, mes] = key.split('-')
            return <Grupo key={key} titulo={`${MESES[Number(mes) - 1]} ${anio}`} color="#40b5fa" tareas={ts} />
          })}
        </div>
      )}
    </div>
  )
}

function Grupo({ titulo, color, tareas }: { titulo: string; color: string; tareas: Row[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color }}>{titulo}</p>
        <div className="flex-1 h-px" style={{ background: 'rgba(0,40,80,0.08)' }} />
        <span className="text-[11px] font-semibold" style={{ color: '#86a2b2' }}>
          {tareas.length} {tareas.length === 1 ? 'fecha' : 'fechas'}
        </span>
      </div>
      <div className="space-y-1.5">
        {tareas.map((t: Row) => <Fila key={t.id} t={t} />)}
      </div>
    </div>
  )
}

function Fila({ t }: { t: Row }) {
  const fecha = parseLocal(t.due_date)
  const dias = daysUntil(t.due_date)
  const vencida = dias < 0
  const clientes = taskCompanyNames(t)
  const responsable = t.profiles?.full_name
  const aviso = avisoLabel(t.aviso_dias_antes)

  return (
    <div className="flex items-center gap-4 rounded-2xl px-4 py-3"
      style={{
        background: vencida ? 'rgba(255,107,107,0.04)' : '#ffffff',
        border: `1px solid ${vencida ? 'rgba(255,107,107,0.18)' : 'rgba(0,40,80,0.08)'}`,
      }}>
      {/* Día */}
      <div className="flex flex-col items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: 48, height: 48, background: vencida ? 'rgba(255,107,107,0.08)' : 'rgba(64,181,250,0.07)' }}>
        <span className="text-lg font-black leading-none" style={{ color: vencida ? '#ff6b6b' : '#40b5fa' }}>
          {fecha.getDate()}
        </span>
        <span className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: '#86a2b2' }}>
          {DIA_CORTO[fecha.getDay()]}
        </span>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{t.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {clientes.map((nombre: string) => (
            <span key={nombre} className="text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1"
              style={{ background: 'rgba(52,211,153,0.08)', color: '#059669' }}>
              <Building2 className="w-2.5 h-2.5" />{nombre}
            </span>
          ))}
          {clientes.length === 0 && (
            <span className="text-[11px]" style={{ color: '#b0bcc7' }}>LCL (interno)</span>
          )}
          {t.task_type === 'recurrente' && t.recurrence && (
            <span className="text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1"
              style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa' }}>
              <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_CONFIG[t.recurrence as Recurrence]?.label ?? 'Recurrente'}
            </span>
          )}
          {aviso && (
            <span className="text-[11px] flex items-center gap-1" style={{ color: '#a78bfa' }}>
              <BellRing className="w-2.5 h-2.5" />Avisa {aviso}
            </span>
          )}
          {responsable && <span className="text-[11px]" style={{ color: '#86a2b2' }}>→ {responsable}</span>}
        </div>
      </div>

      {/* Cuenta regresiva */}
      <div className="text-right flex-shrink-0">
        {vencida ? (
          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#ff6b6b' }}>
            <AlertTriangle className="w-3 h-3" />{Math.abs(dias)}d
          </span>
        ) : (
          <>
            <p className="text-sm font-black leading-none" style={{ color: dias <= 15 ? '#fb923c' : '#1a2e3b' }}>
              {dias === 0 ? 'Hoy' : dias}
            </p>
            {dias > 0 && (
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#86a2b2' }}>
                {dias === 1 ? 'día' : 'días'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
