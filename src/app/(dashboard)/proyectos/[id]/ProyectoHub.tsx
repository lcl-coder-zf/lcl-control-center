'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckSquare, FileText, Plus, Upload, Download,
  Trash2, X, Loader2, CheckCircle2, Circle,
} from 'lucide-react'

const PRIORITY = {
  baja:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)',   label: 'Baja' },
  media:   { color: '#ffd93d', bg: 'rgba(255,217,61,0.10)',   label: 'Media' },
  alta:    { color: '#fb923c', bg: 'rgba(251,146,60,0.10)',   label: 'Alta' },
  critica: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)', label: 'Crítica' },
}

interface Props {
  projectId: string
  companyId: string
  initialProgress: number
  initialTasks: any[]
  initialDocs: any[]
  profiles: { id: string; full_name: string }[]
  canEdit: boolean
  userId: string
}

export default function ProyectoHub({
  projectId, companyId, initialProgress, initialTasks, initialDocs, profiles, canEdit, userId,
}: Props) {
  const [tab, setTab] = useState<'tareas' | 'documentos'>('tareas')

  // Progress
  const [progress, setProgress] = useState(initialProgress)
  const [savingProgress, setSavingProgress] = useState(false)
  const [progressSaved, setProgressSaved] = useState(false)

  // Tasks
  const [tasks, setTasks] = useState(initialTasks)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'media', assigned_to: '' })
  const [addingTask, setAddingTask] = useState(false)

  // Docs
  const [docs, setDocs] = useState(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function saveProgress() {
    setSavingProgress(true)
    const supabase = createClient()
    await supabase.from('projects').update({ progress, updated_at: new Date().toISOString() }).eq('id', projectId)
    setSavingProgress(false)
    setProgressSaved(true)
    setTimeout(() => setProgressSaved(false), 2000)
  }

  async function toggleTask(task: any) {
    const newStatus = task.status === 'completada' ? 'en_progreso' : 'completada'
    const supabase = createClient()
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  async function addTask() {
    if (!newTask.title.trim() || !newTask.due_date) return
    setAddingTask(true)
    const supabase = createClient()
    const { data } = await supabase.from('tasks').insert([{
      project_id: projectId,
      company_id: companyId,
      title: newTask.title,
      due_date: newTask.due_date,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to || userId,
      status: 'pendiente',
      created_by: userId,
    }]).select().single()
    if (data) {
      setTasks(prev => [...prev, data])
      setNewTask({ title: '', due_date: '', priority: 'media', assigned_to: '' })
      setShowNewTask(false)
    }
    setAddingTask(false)
  }

  async function deleteTask(id: string) {
    if (!canEdit) return
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function uploadDoc(file: File) {
    setUploading(true)
    const supabase = createClient()
    const path = `proyectos/${projectId}/${Date.now()}-${file.name}`
    const { data: upload, error } = await supabase.storage.from('documents').upload(path, file)
    if (!error && upload) {
      const { data: doc } = await supabase.from('documents').insert([{
        company_id: companyId,
        project_id: projectId,
        name: file.name,
        type: 'documento',
        status: 'pendiente',
        file_url: path,
        version: '1.0',
        uploaded_by: userId,
      }]).select().single()
      if (doc) setDocs(prev => [doc, ...prev])
    }
    setUploading(false)
  }

  async function downloadDoc(doc: any) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteDoc(doc: any) {
    if (!canEdit) return
    const supabase = createClient()
    await supabase.storage.from('documents').remove([doc.file_url])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadDoc(file)
  }

  const doneTasks = tasks.filter(t => t.status === 'completada').length

  return (
    <div>
      {/* Progress */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b8fa0' }}>
            Avance del proyecto
          </span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black" style={{ color: '#40b5fa' }}>{progress}%</span>
            <button onClick={saveProgress} disabled={savingProgress}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              style={{
                background: progressSaved ? 'rgba(74,222,128,0.15)' : '#40b5fa',
                color: progressSaved ? '#4ade80' : '#fff',
              }}>
              {savingProgress
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : progressSaved ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
        <input type="range" min={0} max={100} value={progress}
          onChange={e => setProgress(Number(e.target.value))}
          className="w-full mb-2 accent-blue-400" />
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#40b5fa' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'tareas', icon: CheckSquare, label: `Tareas (${doneTasks}/${tasks.length})` },
          { id: 'documentos', icon: FileText, label: `Documentos (${docs.length})` },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: tab === id ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
              color: tab === id ? '#40b5fa' : '#6b8fa0',
              border: `1px solid ${tab === id ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Panel Tareas */}
      {tab === 'tareas' && (
        <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Tareas</p>
            <button onClick={() => setShowNewTask(!showNewTask)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
              <Plus className="w-3.5 h-3.5" />Nueva tarea
            </button>
          </div>

          {showNewTask && (
            <div className="rounded-xl p-4 mb-4 space-y-3"
              style={{ background: '#f4f7fa', border: '1px solid rgba(64,181,250,0.2)' }}>
              <input
                placeholder="Título de la tarea *"
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={newTask.due_date}
                  onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                <select value={newTask.priority}
                  onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
                <select value={newTask.assigned_to}
                  onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                  <option value="">Sin asignar</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewTask(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: '#e2e8f0', color: '#6b8fa0' }}>Cancelar</button>
                <button onClick={addTask} disabled={addingTask}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                  style={{ background: '#40b5fa', color: '#fff' }}>
                  {addingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: '#6b8fa0' }}>
              Sin tareas. Agrega la primera.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => {
                const pr = PRIORITY[t.priority as keyof typeof PRIORITY] ?? PRIORITY.media
                const done = t.status === 'completada'
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
                    <button onClick={() => toggleTask(t)} className="flex-shrink-0">
                      {done
                        ? <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} />
                        : <Circle className="w-5 h-5" style={{ color: '#86a2b2' }} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium"
                        style={{ color: '#1a2e3b', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.45 : 1 }}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: pr.bg, color: pr.color }}>{pr.label}</span>
                        {t.due_date && (
                          <span className="text-[10px]" style={{ color: '#6b8fa0' }}>
                            {new Date(t.due_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {t.profiles?.full_name && (
                          <span className="text-[10px]" style={{ color: '#86a2b2' }}>{t.profiles.full_name}</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteTask(t.id)}
                        className="flex-shrink-0 p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity"
                        style={{ color: '#ff6b6b' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Panel Documentos */}
      {tab === 'documentos' && (
        <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#40b5fa' }}>Documentos</p>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('doc-proj-upload')?.click()}
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 mb-4 cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? '#40b5fa' : 'rgba(0,40,80,0.15)',
              background: dragOver ? 'rgba(64,181,250,0.04)' : '#fafbfc',
            }}>
            {uploading
              ? <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: '#40b5fa' }} />
              : <Upload className="w-8 h-8 mb-2" style={{ color: '#6b8fa0' }} />}
            <p className="text-sm font-medium" style={{ color: '#6b8fa0' }}>
              {uploading ? 'Subiendo...' : 'Arrastra un archivo o haz clic para subir'}
            </p>
            <input id="doc-proj-upload" type="file" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = '' }} />
          </div>

          {docs.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#6b8fa0' }}>Sin documentos subidos</p>
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#40b5fa' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{d.name}</p>
                    <p className="text-xs" style={{ color: '#6b8fa0' }}>
                      {new Date(d.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <button onClick={() => downloadDoc(d)}
                    className="p-1.5 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {canEdit && (
                    <button onClick={() => deleteDoc(d)}
                      className="p-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(255,107,107,0.10)', color: '#ff6b6b' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
