'use client'

import { useState } from 'react'
import {
  CheckSquare, Clock, AlertTriangle, Check, Loader2, RefreshCw,
  ChevronDown, Plus, X, CornerDownRight, Trash2,
} from 'lucide-react'
import { formatDate, daysUntil } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { regenerateIfRecurring, RECURRENCE_CONFIG, type Recurrence } from '@/lib/tasks'

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct    = total === 0 ? 0 : Math.round((done / total) * 100)
  const r      = 13
  const circ   = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  const color  = pct === 100 ? '#4ade80' : pct === 0 ? 'rgba(0,40,80,0.12)' : '#40b5fa'
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34 }}>
      <svg width="34" height="34" viewBox="0 0 34 34" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(0,40,80,0.07)" strokeWidth="3" />
        <circle cx="17" cy="17" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 400ms ease, stroke 300ms ease' }} />
      </svg>
      <span className="absolute text-[9px] font-bold" style={{ color: pct === 100 ? '#4ade80' : pct === 0 ? '#b0bcc7' : '#40b5fa' }}>
        {pct}%
      </span>
    </div>
  )
}

const PRIORITY_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  baja:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)',  label: 'Baja' },
  media:   { color: '#ffd93d', bg: 'rgba(255,217,61,0.10)',  label: 'Media' },
  alta:    { color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  label: 'Alta' },
  critica: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', label: 'Crítica' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TareasList({ tasks, onRefresh }: { tasks: any[]; onRefresh?: () => void }) {
  const [completing, setCompleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null)
  const [subTitle, setSubTitle] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function toggleComplete(task: any) {
    setCompleting(task.id)
    const supabase = createClient()
    const done = task.status === 'completada'
    if (done) {
      // Reabrir: vuelve a pendiente.
      await supabase.from('tasks').update({ status: 'pendiente', completed_at: null }).eq('id', task.id)
    } else {
      await supabase.from('tasks').update({
        status: 'completada',
        completed_at: new Date().toISOString(),
      }).eq('id', task.id)
      // Si es recurrente y activa, genera la siguiente ocurrencia.
      await regenerateIfRecurring(supabase, task)
    }
    setCompleting(null)
    onRefresh?.()
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function addSubtask(parent: any) {
    if (!subTitle.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert([{
      title: subTitle.trim(),
      parent_id: parent.id,
      company_id: parent.company_id ?? null,
      project_id: parent.project_id ?? null,
      assigned_to: parent.assigned_to ?? user?.id ?? null,
      priority: 'media',
      status: 'pendiente',
      due_date: parent.due_date,
      task_type: 'esporadica',
      recurrence_active: false,
      created_by: user?.id ?? null,
    }])
    setSubTitle('')
    setAddingSubFor(null)
    onRefresh?.()
  }

  async function deleteSubtask(id: string) {
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    onRefresh?.()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function deleteTask(task: any) {
    if (!confirm(`¿Eliminar la tarea "${task.title}" y sus subtareas?`)) return
    const supabase = createClient()
    // Borra la tarea y cualquier subtarea suya.
    await supabase.from('tasks').delete().or(`id.eq.${task.id},parent_id.eq.${task.id}`)
    onRefresh?.()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function toggleSubtask(sub: any) {
    const supabase = createClient()
    const newStatus = sub.status === 'completada' ? 'pendiente' : 'completada'
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completada' ? new Date().toISOString() : null,
    }).eq('id', sub.id)
    onRefresh?.()
  }

  // Solo tareas de primer nivel en la lista; las subtareas se anidan.
  const topLevel = tasks.filter(t => !t.parent_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSubtasks = (id: string) => tasks.filter((t: any) => t.parent_id === id)

  if (topLevel.length === 0) {
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
      {topLevel.map(t => {
        const pr = PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.media
        const days = daysUntil(t.due_date)
        const isVencida = t.status === 'vencida' || (days < 0 && t.status !== 'completada')
        const isUrgente = days <= 2 && days >= 0 && t.status !== 'completada'
        const isCompleta = t.status === 'completada'
        const subtasks = getSubtasks(t.id)
        const doneSubs = subtasks.filter(s => s.status === 'completada').length
        const isOpen = expanded.has(t.id)

        return (
          <div key={t.id} className="rounded-2xl transition-all"
            style={{
              background: isVencida ? 'rgba(255,107,107,0.04)' : '#ffffff',
              border: `1px solid ${isVencida ? 'rgba(255,107,107,0.18)' : isUrgente ? 'rgba(255,217,61,0.2)' : 'rgba(0,40,80,0.08)'}`,
            }}>

            {/* Fila principal */}
            <div className="px-5 py-4 flex items-center gap-4" style={{ opacity: isCompleta ? 0.65 : 1 }}>
              {/* Checkbox — ahora togglea (completar ↔ reabrir) */}
              <button
                onClick={() => toggleComplete(t)}
                disabled={completing === t.id}
                title={isCompleta ? 'Reabrir tarea' : 'Marcar completada'}
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

              {/* Progreso subtareas (anillo) o barra de prioridad */}
              {subtasks.length > 0
                ? <ProgressRing done={doneSubs} total={subtasks.length} />
                : <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: pr.color, opacity: isCompleta ? 0.4 : 1 }} />
              }

              {/* Contenido clickeable → expande detalle */}
              <button onClick={() => toggleExpand(t.id)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium mb-0.5 flex items-center gap-1.5" style={{
                  color: '#1a2e3b', textDecoration: isCompleta ? 'line-through' : 'none',
                }}>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
                    style={{ color: '#86a2b2', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                  <span className="truncate">{t.title}</span>
                </p>
                <div className="flex items-center gap-3 flex-wrap pl-5">
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
                  {subtasks.length > 0 && (
                    <span className="text-xs" style={{ color: '#a78bfa' }}>{doneSubs}/{subtasks.length} subtareas</span>
                  )}
                </div>
              </button>

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
                <button onClick={() => deleteTask(t)} title="Eliminar tarea"
                  className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#ff6b6b' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Detalle expandido */}
            {isOpen && (
              <div className="px-5 pb-4 pt-1" style={{ borderTop: '1px solid rgba(0,40,80,0.06)' }}>
                {/* Descripción */}
                <div className="mt-3 mb-3 ml-11">
                  <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#86a2b2' }}>Descripción</p>
                  {t.description
                    ? <p className="text-sm whitespace-pre-wrap" style={{ color: '#4a5a6b' }}>{t.description}</p>
                    : <p className="text-sm italic" style={{ color: '#b0bcc7' }}>Sin descripción</p>}
                </div>

                {/* Subtareas */}
                <div className="ml-11">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#86a2b2' }}>
                      Subtareas {subtasks.length > 0 && `· ${doneSubs}/${subtasks.length}`}
                    </p>
                    <button onClick={() => { setAddingSubFor(addingSubFor === t.id ? null : t.id); setSubTitle('') }}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                      <Plus className="w-3 h-3" />Subtarea
                    </button>
                  </div>
                  {subtasks.length > 0 && (
                    <div className="mb-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,40,80,0.07)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((doneSubs / subtasks.length) * 100)}%`,
                          background: doneSubs === subtasks.length ? '#4ade80' : '#40b5fa',
                        }} />
                    </div>
                  )}

                  {subtasks.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {subtasks.map(s => {
                        const sDone = s.status === 'completada'
                        return (
                          <div key={s.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                            style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.05)' }}>
                            <button onClick={() => toggleSubtask(s)}
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{ background: sDone ? 'rgba(74,222,128,0.2)' : '#fff', border: `1.5px solid ${sDone ? '#4ade80' : 'rgba(0,40,80,0.15)'}` }}>
                              {sDone && <Check className="w-2.5 h-2.5" style={{ color: '#4ade80' }} />}
                            </button>
                            <span className="flex-1 text-sm" style={{ color: '#1a2e3b', textDecoration: sDone ? 'line-through' : 'none', opacity: sDone ? 0.5 : 1 }}>
                              {s.title}
                            </span>
                            <button onClick={() => deleteSubtask(s.id)}
                              className="p-0.5 rounded opacity-30 hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: '#ff6b6b' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {addingSubFor === t.id && (
                    <div className="flex gap-2">
                      <div className="flex items-center flex-1 gap-2 rounded-xl px-3 py-1.5"
                        style={{ background: '#fff', border: '1px solid rgba(64,181,250,0.3)' }}>
                        <CornerDownRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#86a2b2' }} />
                        <input autoFocus value={subTitle} onChange={e => setSubTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addSubtask(t); if (e.key === 'Escape') setAddingSubFor(null) }}
                          placeholder="Título de la subtarea…"
                          className="flex-1 text-sm outline-none" style={{ color: '#1a2e3b' }} />
                      </div>
                      <button onClick={() => addSubtask(t)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: '#40b5fa', color: '#fff' }}>Agregar</button>
                      <button onClick={() => setAddingSubFor(null)}
                        className="px-3 py-2 rounded-xl text-xs" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>✕</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
