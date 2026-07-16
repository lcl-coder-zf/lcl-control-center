'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, X, Loader2, RefreshCw, CheckCircle2, Circle, ChevronDown, CheckSquare,
} from 'lucide-react'
import { regenerateIfRecurring, RECURRENCE_CONFIG, RECURRENCE_OPTIONS, type Recurrence } from '@/lib/tasks'
import { notify, adminIds } from '@/lib/notify'

const PRIORITY = {
  baja:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)',   label: 'Baja' },
  media:   { color: '#ffd93d', bg: 'rgba(255,217,61,0.10)',   label: 'Media' },
  alta:    { color: '#fb923c', bg: 'rgba(251,146,60,0.10)',   label: 'Alta' },
  critica: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', label: 'Crítica' },
}

interface Props {
  companyId: string
  companyName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialTasks: any[]
  profiles: { id: string; full_name: string }[]
  canEdit: boolean
  userId: string
}

export default function ClienteTareas({ companyId, companyName, initialTasks, profiles, canEdit, userId }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'media', assigned_to: '', task_type: 'esporadica', recurrence: 'mensual' })
  const [addingTask, setAddingTask] = useState(false)

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function toggleTask(task: any) {
    const newStatus = task.status === 'completada' ? 'pendiente' : 'completada'
    const supabase = createClient()
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completada' ? new Date().toISOString() : null,
    }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    if (newStatus === 'completada') {
      const created = await regenerateIfRecurring(supabase, task)
      if (created) setTasks(prev => [...prev, created])
    }
  }

  async function addTask() {
    if (!newTask.title.trim() || !newTask.due_date) return
    setAddingTask(true)
    const supabase = createClient()
    const { data } = await supabase.from('tasks').insert([{
      company_id: companyId,
      title: newTask.title,
      due_date: newTask.due_date,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to || userId,
      status: 'pendiente',
      task_type: newTask.task_type,
      recurrence: newTask.task_type === 'recurrente' ? newTask.recurrence : null,
      recurrence_active: newTask.task_type === 'recurrente',
      created_by: userId,
    }]).select('*, profiles(id, full_name)').single()
    if (data) {
      setTasks(prev => [...prev, data])
      // Notificar al responsable + admins (Laura y Daniel reciben todo).
      const admins = await adminIds(supabase)
      await notify(supabase, {
        recipientIds: [data.assigned_to, ...admins],
        type: 'tarea_asignada',
        message: `Nueva tarea: "${data.title}" · ${companyName}`,
        link: `/clientes/${companyId}`,
        actorId: userId,
      })
      setNewTask({ title: '', due_date: '', priority: 'media', assigned_to: '', task_type: 'esporadica', recurrence: 'mensual' })
      setShowNewTask(false)
    }
    setAddingTask(false)
  }

  async function deleteTask(id: string) {
    if (!canEdit) return
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id))
  }

  async function addSubtask(parentId: string) {
    if (!newSubtaskTitle.trim()) return
    const supabase = createClient()
    const parent = tasks.find(t => t.id === parentId)
    const { data } = await supabase.from('tasks').insert([{
      company_id: companyId,
      title: newSubtaskTitle.trim(),
      parent_id: parentId,
      priority: 'media',
      assigned_to: parent?.assigned_to ?? userId,
      status: 'pendiente',
      due_date: parent?.due_date,
      recurrence_active: false,
      created_by: userId,
    }]).select().single()
    if (data) {
      setTasks(prev => [...prev, data])
      setExpandedTasks(prev => new Set([...prev, parentId]))
    }
    setNewSubtaskTitle('')
    setAddingSubtaskFor(null)
  }

  function toggleExpand(taskId: string) {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId)
      return next
    })
  }

  const topLevelTasks = tasks.filter(t => !t.parent_id)
  const getSubtasks = (parentId: string) => tasks.filter(t => t.parent_id === parentId)
  const doneTasks = topLevelTasks.filter(t => t.status === 'completada').length
  const progress = topLevelTasks.length > 0 ? Math.round((doneTasks / topLevelTasks.length) * 100) : 0

  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
      {/* Avance derivado + header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#40b5fa' }}>
          <CheckSquare className="w-3.5 h-3.5" />Tareas ({doneTasks}/{topLevelTasks.length})
        </p>
        <button onClick={() => setShowNewTask(!showNewTask)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
          <Plus className="w-3.5 h-3.5" />Nueva tarea
        </button>
      </div>

      {/* Barra de avance */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress < 30 ? '#ff6b6b' : progress < 70 ? '#ffd93d' : '#4ade80' }} />
        </div>
        <span className="text-sm font-black tabular-nums" style={{ color: '#40b5fa' }}>{progress}%</span>
      </div>

      {showNewTask && (
        <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: '#f4f7fa', border: '1px solid rgba(64,181,250,0.2)' }}>
          <input placeholder="Título de la tarea *" value={newTask.title}
            onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))}
              className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
            <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
              className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
              <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option>
            </select>
            <select value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))}
              className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
              <option value="">Sin asignar</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {(['esporadica', 'recurrente'] as const).map(tt => (
              <button key={tt} type="button" onClick={() => setNewTask(p => ({ ...p, task_type: tt }))}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: newTask.task_type === tt ? 'rgba(64,181,250,0.12)' : '#fff', color: newTask.task_type === tt ? '#40b5fa' : '#6b8fa0', border: `1px solid ${newTask.task_type === tt ? 'rgba(64,181,250,0.4)' : 'rgba(0,40,80,0.10)'}` }}>
                {tt === 'esporadica' ? 'Esporádica' : 'Recurrente'}
              </button>
            ))}
            {newTask.task_type === 'recurrente' && (
              <select value={newTask.recurrence} onChange={e => setNewTask(p => ({ ...p, recurrence: e.target.value }))}
                className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{RECURRENCE_CONFIG[r].label}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewTask(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: '#e2e8f0', color: '#6b8fa0' }}>Cancelar</button>
            <button onClick={addTask} disabled={addingTask} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#40b5fa', color: '#fff' }}>
              {addingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {topLevelTasks.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: '#6b8fa0' }}>Sin tareas. Agrega la primera.</p>
      ) : (
        <div className="space-y-1.5">
          {topLevelTasks.map(t => {
            const subtasks = getSubtasks(t.id)
            const isExpanded = expandedTasks.has(t.id)
            const pr = PRIORITY[t.priority as keyof typeof PRIORITY] ?? PRIORITY.media
            const done = t.status === 'completada'
            const doneSubtasks = subtasks.filter(s => s.status === 'completada').length

            return (
              <div key={t.id}>
                <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
                  <button onClick={() => toggleTask(t)} className="flex-shrink-0">
                    {done ? <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} /> : <Circle className="w-5 h-5" style={{ color: '#86a2b2' }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: '#1a2e3b', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.45 : 1 }}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: pr.bg, color: pr.color }}>{pr.label}</span>
                      {t.task_type === 'recurrente' && t.recurrence && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(52,211,153,0.10)', color: '#059669' }}>
                          <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_CONFIG[t.recurrence as Recurrence]?.short ?? 'Rec'}
                        </span>
                      )}
                      {t.due_date && <span className="text-[10px]" style={{ color: '#6b8fa0' }}>{new Date(t.due_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>}
                      {t.profiles?.full_name && <span className="text-[10px]" style={{ color: '#86a2b2' }}>{t.profiles.full_name}</span>}
                      {subtasks.length > 0 && <span className="text-[10px]" style={{ color: '#a78bfa' }}>{doneSubtasks}/{subtasks.length} subtareas</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {subtasks.length > 0 && (
                      <button onClick={() => toggleExpand(t.id)} className="p-1 rounded-lg" style={{ color: '#a78bfa' }}>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    <button onClick={() => { setAddingSubtaskFor(addingSubtaskFor === t.id ? null : t.id); setNewSubtaskTitle('') }}
                      title="Agregar subtarea" className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#40b5fa' }}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button onClick={() => deleteTask(t.id)} className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#ff6b6b' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {addingSubtaskFor === t.id && (
                  <div className="flex gap-2 mt-1.5 ml-9">
                    <input autoFocus value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubtask(t.id); if (e.key === 'Escape') setAddingSubtaskFor(null) }}
                      placeholder="Título de subtarea..." className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(64,181,250,0.3)', color: '#1a2e3b' }} />
                    <button onClick={() => addSubtask(t.id)} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: '#40b5fa', color: '#fff' }}>Agregar</button>
                    <button onClick={() => setAddingSubtaskFor(null)} className="px-3 py-2 rounded-xl text-xs" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>✕</button>
                  </div>
                )}

                {(isExpanded || addingSubtaskFor === t.id) && subtasks.length > 0 && (
                  <div className="ml-9 mt-1 space-y-1">
                    {subtasks.map(s => {
                      const sDone = s.status === 'completada'
                      return (
                        <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.05)' }}>
                          <button onClick={() => toggleTask(s)} className="flex-shrink-0">
                            {sDone ? <CheckCircle2 className="w-4 h-4" style={{ color: '#4ade80' }} /> : <Circle className="w-4 h-4" style={{ color: '#86a2b2' }} />}
                          </button>
                          <p className="flex-1 text-sm" style={{ color: '#1a2e3b', textDecoration: sDone ? 'line-through' : 'none', opacity: sDone ? 0.4 : 1 }}>{s.title}</p>
                          {canEdit && (
                            <button onClick={() => deleteTask(s.id)} className="p-0.5 rounded opacity-20 hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: '#ff6b6b' }}>
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
