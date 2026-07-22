'use client'

import { useState } from 'react'
import {
  CheckSquare, Clock, AlertTriangle, Check, Loader2, RefreshCw,
  ChevronDown, Plus, X, CornerDownRight, Trash2, Pencil,
} from 'lucide-react'
import { formatDate, daysUntil } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { regenerateIfRecurring, RECURRENCE_CONFIG, RECURRENCE_OPTIONS, type Recurrence } from '@/lib/tasks'

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
export default function TareasList({
  tasks,
  profiles,
  companies,
  onRefresh,
}: {
  tasks: any[]
  profiles: { id: string; full_name: string }[]
  companies: { id: string; name: string }[]
  onRefresh?: () => void
}) {
  const [completing, setCompleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null)
  const [subTitle, setSubTitle] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingTask, setEditingTask] = useState<any | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function toggleComplete(task: any) {
    setCompleting(task.id)
    const supabase = createClient()
    const done = task.status === 'completada'
    if (done) {
      await supabase.from('tasks').update({ status: 'pendiente', completed_at: null }).eq('id', task.id)
    } else {
      await supabase.from('tasks').update({ status: 'completada', completed_at: new Date().toISOString() }).eq('id', task.id)
      await regenerateIfRecurring(supabase, task)
      // Push a admins cuando se completa una tarea
      fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '✅ Tarea completada',
          body: `"${task.title}"${task.companies?.name ? ' · ' + task.companies.name : ''}`,
          url: '/tareas',
          topic: 'admin',
        }),
      }).catch(() => {})
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

  const topLevel = tasks.filter(t => !t.parent_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSubtasks = (id: string) => tasks.filter((t: any) => t.parent_id === id)

  // Obtiene los nombres de todos los asignados de una tarea
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getAssigneeNames(t: any): string[] {
    const fromJunction: string[] = (t.task_assignees ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => a.profiles?.full_name)
      .filter(Boolean)
    if (fromJunction.length > 0) return fromJunction
    if (t.profiles?.full_name) return [t.profiles.full_name]
    return []
  }

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
    <>
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
          const assigneeNames = getAssigneeNames(t)

          return (
            <div key={t.id} className="rounded-2xl transition-all"
              style={{
                background: isVencida ? 'rgba(255,107,107,0.04)' : '#ffffff',
                border: `1px solid ${isVencida ? 'rgba(255,107,107,0.18)' : isUrgente ? 'rgba(255,217,61,0.2)' : 'rgba(0,40,80,0.08)'}`,
              }}>

              {/* Fila principal */}
              <div className="px-5 py-4 flex items-center gap-4" style={{ opacity: isCompleta ? 0.65 : 1 }}>
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

                {subtasks.length > 0
                  ? <ProgressRing done={doneSubs} total={subtasks.length} />
                  : <ProgressRing done={isCompleta ? 1 : 0} total={1} />
                }

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
                    {assigneeNames.length > 0 && (
                      <span className="text-xs" style={{ color: '#6b8fa0' }}>
                        → {assigneeNames.length === 1 ? assigneeNames[0] : `${assigneeNames[0]} +${assigneeNames.length - 1}`}
                      </span>
                    )}
                    {subtasks.length > 0 && (
                      <span className="text-xs" style={{ color: '#a78bfa' }}>{doneSubs}/{subtasks.length} subtareas</span>
                    )}
                  </div>
                </button>

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
                  <button onClick={() => setEditingTask(t)} title="Editar tarea"
                    className="p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity" style={{ color: '#40b5fa' }}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTask(t)} title="Eliminar tarea"
                    className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#ff6b6b' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Detalle expandido */}
              {isOpen && (
                <div className="px-5 pb-4 pt-1" style={{ borderTop: '1px solid rgba(0,40,80,0.06)' }}>
                  <div className="mt-3 mb-3 ml-11">
                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#86a2b2' }}>Descripción</p>
                    {t.description
                      ? <p className="text-sm whitespace-pre-wrap" style={{ color: '#4a5a6b' }}>{t.description}</p>
                      : <p className="text-sm italic" style={{ color: '#b0bcc7' }}>Sin descripción</p>}
                  </div>

                  {/* Co-asignados expandidos */}
                  {assigneeNames.length > 1 && (
                    <div className="ml-11 mb-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#86a2b2' }}>Asignados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {assigneeNames.map(name => (
                          <span key={name} className="text-xs px-2.5 py-1 rounded-lg"
                            style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa', border: '1px solid rgba(64,181,250,0.2)' }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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

      {editingTask && (
        <EditTareaModal
          task={editingTask}
          profiles={profiles}
          companies={companies}
          onClose={() => setEditingTask(null)}
          onSaved={() => { setEditingTask(null); onRefresh?.() }}
        />
      )}
    </>
  )
}

function EditTareaModal({
  task, profiles, companies, onClose, onSaved,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any
  profiles: { id: string; full_name: string }[]
  companies: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(task.title ?? '')
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState(task.priority ?? 'media')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [companyId, setCompanyId] = useState(task.company_id ?? '')
  const [taskType, setTaskType] = useState(task.task_type ?? 'esporadica')
  const [recurrence, setRecurrence] = useState(task.recurrence ?? 'mensual')

  // Asignados actuales: toma de task_assignees si existe, si no del assigned_to
  const initialAssigned = (): Set<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromJunction = (task.task_assignees ?? []).map((a: any) => a.profile_id).filter(Boolean) as string[]
    if (fromJunction.length > 0) return new Set(fromJunction)
    if (task.assigned_to) return new Set([task.assigned_to])
    return new Set()
  }
  const [assignedIds, setAssignedIds] = useState<Set<string>>(initialAssigned)

  function toggleAssignee(id: string) {
    setAssignedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function save() {
    if (!title.trim() || !dueDate) return
    if (assignedIds.size === 0) { alert('Asigna la tarea a alguien'); return }
    setSaving(true)
    const supabase = createClient()
    const assignedArr = [...assignedIds]

    await supabase.from('tasks').update({
      title,
      description: description || null,
      priority,
      due_date: dueDate,
      company_id: companyId || null,
      assigned_to: assignedArr[0],
      task_type: taskType,
      recurrence: taskType === 'recurrente' ? recurrence : null,
      recurrence_active: taskType === 'recurrente',
    }).eq('id', task.id)

    // Reemplazar asignados
    await supabase.from('task_assignees').delete().eq('task_id', task.id)
    await supabase.from('task_assignees').insert(
      assignedArr.map(pid => ({ task_id: task.id, profile_id: pid }))
    )

    setSaving(false)
    onSaved()
  }

  const INP: React.CSSProperties = { background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b', borderRadius: 12, padding: '10px 14px', fontSize: 13, width: '100%', outline: 'none' }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full lg:max-w-lg rounded-t-2xl lg:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#e2e8f5' }}>
          <h2 className="font-bold text-sm" style={{ color: '#1a2e3b' }}>Editar tarea</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={INP} />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...INP, resize: 'none' } as React.CSSProperties} />
          </div>

          {/* Prioridad + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Prioridad</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={INP}>
                <option value="baja">🟢 Baja</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🟠 Alta</option>
                <option value="critica">🔴 Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Fecha límite *</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={INP} />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'esporadica', label: 'Esporádica' },
                { id: 'recurrente', label: 'Recurrente' },
              ].map(o => (
                <button key={o.id} type="button" onClick={() => setTaskType(o.id)}
                  className="py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: taskType === o.id ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                    color: taskType === o.id ? '#40b5fa' : '#6b8fa0',
                    border: `1px solid ${taskType === o.id ? 'rgba(64,181,250,0.4)' : 'rgba(0,40,80,0.10)'}`,
                  }}>{o.label}</button>
              ))}
            </div>
          </div>
          {taskType === 'recurrente' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Frecuencia</label>
              <select value={recurrence} onChange={e => setRecurrence(e.target.value)} style={INP}>
                {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{RECURRENCE_CONFIG[r].label}</option>)}
              </select>
            </div>
          )}

          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#6b8fa0' }}>Cliente</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={INP}>
              <option value="">LCL (interno)</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Asignados */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6b8fa0' }}>
              Asignar a * {assignedIds.size > 1 && <span style={{ color: '#40b5fa' }}>({assignedIds.size} personas)</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map(p => {
                const on = assignedIds.has(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggleAssignee(p.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                    style={{
                      background: on ? 'rgba(64,181,250,0.10)' : '#f4f7fa',
                      color: on ? '#40b5fa' : '#6b8fa0',
                      border: `1px solid ${on ? 'rgba(64,181,250,0.4)' : 'rgba(0,40,80,0.10)'}`,
                    }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: on ? '#40b5fa' : '#fff', border: `1.5px solid ${on ? '#40b5fa' : 'rgba(0,40,80,0.15)'}` }}>
                      {on && <span className="text-white text-[9px]">✓</span>}
                    </span>
                    <span className="truncate">{p.full_name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f5', color: '#6b7a9e' }}>Cancelar</button>
          <button onClick={save} disabled={saving || !title.trim() || !dueDate}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1"
            style={{ background: '#40b5fa' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
