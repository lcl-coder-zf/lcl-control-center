'use client'

import { useState } from 'react'
import { CheckSquare, Clock, AlertTriangle, Check, Loader2, RefreshCw } from 'lucide-react'
import { formatDate, daysUntil } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { regenerateIfRecurring, RECURRENCE_CONFIG, type Recurrence } from '@/lib/tasks'

const PRIORITY_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  baja:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)',  label: 'Baja' },
  media:   { color: '#ffd93d', bg: 'rgba(255,217,61,0.10)',  label: 'Media' },
  alta:    { color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  label: 'Alta' },
  critica: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', label: 'Crítica' },
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pendiente:   { color: '#40b5fa', bg: 'rgba(64,181,250,0.10)' },
  en_progreso: { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  completada:  { color: '#4ade80', bg: 'rgba(74,222,128,0.10)' },
  vencida:     { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' },
}

export default function TareasList({ tasks, onRefresh }: { tasks: any[]; onRefresh?: () => void }) {
  const [completing, setCompleting] = useState<string | null>(null)

  async function markComplete(task: any) {
    if (task.status === 'completada') return
    setCompleting(task.id)
    const supabase = createClient()
    await supabase.from('tasks').update({
      status: 'completada',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    // Si es recurrente y activa, genera la siguiente ocurrencia.
    await regenerateIfRecurring(supabase, task)
    setCompleting(null)
    onRefresh?.()
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center py-20"
        style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
        <CheckSquare className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
        <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin tareas</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map(t => {
        const pr = PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.media
        const st = STATUS_STYLES[t.status] ?? STATUS_STYLES.pendiente
        const days = daysUntil(t.due_date)
        const isVencida = t.status === 'vencida' || (days < 0 && t.status !== 'completada')
        const isUrgente = days <= 2 && days >= 0 && t.status !== 'completada'
        const isCompleta = t.status === 'completada'

        return (
          <div key={t.id}
            className="rounded-2xl px-5 py-4 flex items-center gap-4 transition-all"
            style={{
              background: isVencida ? 'rgba(255,107,107,0.04)' : '#ffffff',
              border: `1px solid ${isVencida ? 'rgba(255,107,107,0.18)' : isUrgente ? 'rgba(255,217,61,0.2)' : 'rgba(0,40,80,0.08)'}`,
              opacity: isCompleta ? 0.65 : 1,
            }}>

            {/* Checkbox */}
            <button
              onClick={() => markComplete(t)}
              disabled={isCompleta || completing === t.id}
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: isCompleta ? 'rgba(74,222,128,0.2)' : 'rgba(0,0,0,0.04)',
                border: `2px solid ${isCompleta ? '#4ade80' : 'rgba(0,40,80,0.12)'}`,
              }}>
              {completing === t.id
                ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#40b5fa' }} />
                : isCompleta
                  ? <Check className="w-3 h-3" style={{ color: '#4ade80' }} />
                  : null}
            </button>

            {/* Indicador prioridad */}
            <div className="w-1 h-10 rounded-full flex-shrink-0"
              style={{ background: pr.color, opacity: isCompleta ? 0.4 : 1 }} />

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-0.5" style={{
                color: '#1a2e3b',
                textDecoration: isCompleta ? 'line-through' : 'none',
              }}>
                {t.title}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {t.task_type === 'recurrente' && t.recurrence && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: 'rgba(52,211,153,0.10)', color: '#059669' }}>
                    <RefreshCw className="w-3 h-3" />{RECURRENCE_CONFIG[t.recurrence as Recurrence]?.short ?? 'Recurrente'}
                  </span>
                )}
                {t.companies?.name && (
                  <span className="text-xs" style={{ color: '#6b8fa0' }}>{t.companies.name}</span>
                )}
                {t.projects?.name && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa' }}>
                    {t.projects.name}
                  </span>
                )}
                {t.profiles?.full_name && (
                  <span className="text-xs" style={{ color: '#6b8fa0' }}>→ {t.profiles.full_name}</span>
                )}
              </div>
            </div>

            {/* Fecha y badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: pr.bg, color: pr.color }}>
                {pr.label}
              </span>

              <div className="flex items-center gap-1 text-xs"
                style={{ color: isVencida ? '#ff6b6b' : isUrgente ? '#ffd93d' : '#86a2b2' }}>
                {isVencida
                  ? <><AlertTriangle className="w-3 h-3" />{Math.abs(days)}d vencida</>
                  : isCompleta
                    ? <span style={{ color: '#4ade80' }}>Completada</span>
                    : <><Clock className="w-3 h-3" />{days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : formatDate(t.due_date)}</>
                }
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
