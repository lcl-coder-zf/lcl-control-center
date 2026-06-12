'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  companies: { id: string; name: string }[]
  projects: { id: string; name: string; company_id: string }[]
  profiles: { id: string; full_name: string }[]
  defaultProjectId?: string
  defaultClienteId?: string
  currentUserId?: string
}

export default function NuevaTareaForm({ companies, projects, profiles, defaultProjectId, defaultClienteId, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    company_id: defaultClienteId ?? '',
    project_id: defaultProjectId ?? '',
    assigned_to: currentUserId ?? '',
    priority: 'media',
    status: 'pendiente',
    due_date: '',
  })

  // Filtrar proyectos según cliente seleccionado
  const filteredProjects = form.company_id
    ? projects.filter(p => p.company_id === form.company_id)
    : projects

  function set(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Si cambia cliente, limpiar proyecto si no pertenece
      if (field === 'company_id') next.project_id = ''
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    if (!form.due_date) { setError('La fecha límite es obligatoria'); return }
    if (!form.assigned_to) { setError('Asigna la tarea a alguien'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('tasks').insert([{
      title: form.title,
      description: form.description || null,
      company_id: form.company_id || null,
      project_id: form.project_id || null,
      assigned_to: form.assigned_to,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date,
      created_by: user?.id,
    }])

    if (error) { setError('Error: ' + error.message); setLoading(false); return }
    router.push('/tareas')
    router.refresh()
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/tareas" className="p-2 rounded-xl"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Tareas</p>
          <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>Nueva tarea</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tarea */}
        <Card label="Detalle de la tarea">
          <Fi label="Título *" value={form.title} onChange={v => set('title', v)} placeholder="¿Qué hay que hacer?" />
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>
              Descripción
            </label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Detalles adicionales..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Sel label="Prioridad" value={form.priority} onChange={v => set('priority', v)}>
              <option value="baja">🟢 Baja</option>
              <option value="media">🟡 Media</option>
              <option value="alta">🟠 Alta</option>
              <option value="critica">🔴 Crítica</option>
            </Sel>
            <Fi label="Fecha límite *" value={form.due_date} onChange={v => set('due_date', v)} type="date" />
          </div>
        </Card>

        {/* Asignación */}
        <Card label="Asignación">
          <Sel label="Asignar a *" value={form.assigned_to} onChange={v => set('assigned_to', v)}>
            <option value="">Seleccionar persona...</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Sel>
          <Sel label="Cliente (opcional)" value={form.company_id} onChange={v => set('company_id', v)}>
            <option value="">Sin cliente</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <Sel label="Proyecto (opcional)" value={form.project_id} onChange={v => set('project_id', v)}>
            <option value="">Sin proyecto</option>
            {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Sel>
        </Card>

        {/* Preview prioridad */}
        {form.title && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: form.priority === 'critica' ? 'rgba(255,107,107,0.06)' : form.priority === 'alta' ? 'rgba(251,146,60,0.06)' : 'rgba(64,181,250,0.06)',
              border: `1px solid ${form.priority === 'critica' ? 'rgba(255,107,107,0.2)' : form.priority === 'alta' ? 'rgba(251,146,60,0.2)' : 'rgba(64,181,250,0.15)'}`,
            }}>
            <div className="w-1.5 h-8 rounded-full flex-shrink-0"
              style={{ background: form.priority === 'critica' ? '#ff6b6b' : form.priority === 'alta' ? '#fb923c' : form.priority === 'media' ? '#ffd93d' : '#4ade80' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#1a2e3b' }}>{form.title}</p>
              {form.due_date && (
                <p className="text-xs" style={{ color: '#6b8fa0' }}>
                  Vence: {new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(new Date(form.due_date + 'T12:00:00'))}
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/tareas" className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</> : 'Crear tarea'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 space-y-4"
      style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>{label}</p>
      {children}
    </div>
  )
}

function Fi({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}
        onFocus={e => e.target.style.borderColor = 'rgba(64,181,250,0.5)'}
        onBlur={e => e.target.style.borderColor = 'rgba(0,40,80,0.10)'} />
    </div>
  )
}

function Sel({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
        {children}
      </select>
    </div>
  )
}
