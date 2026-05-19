'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const TIPOS = ['recertificacion', 'auditoria', 'entrega', 'reporte', 'vencimiento']
const TIPO_LABELS: Record<string, string> = {
  recertificacion: 'Recertificación', auditoria: 'Auditoría',
  entrega: 'Entrega', reporte: 'Reporte', vencimiento: 'Vencimiento',
}

export default function NuevoEventoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    type: 'vencimiento',
    company_id: '',
    project_id: '',
    due_date: '',
    alert_15: true,
    alert_7: true,
    alert_1: true,
    notes: '',
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
      supabase.from('projects').select('id, name, company_id').eq('status', 'activo').order('name'),
    ]).then(([{ data: c }, { data: p }]) => {
      setCompanies(c ?? [])
      setProjects(p ?? [])
      const proyectoParam = searchParams.get('proyecto')
      if (proyectoParam) setForm(prev => ({ ...prev, project_id: proyectoParam }))
    })
  }, [])

  const filteredProjects = form.company_id
    ? projects.filter(p => p.company_id === form.company_id)
    : projects

  function set(field: string, value: any) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'company_id') next.project_id = ''
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    if (!form.due_date) { setError('La fecha es obligatoria'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.from('calendar_events').insert([{
      title: form.title,
      type: form.type,
      company_id: form.company_id || null,
      project_id: form.project_id || null,
      due_date: form.due_date,
      alert_15: form.alert_15,
      alert_7: form.alert_7,
      alert_1: form.alert_1,
      notes: form.notes || null,
      status: 'pendiente',
    }])

    if (error) { setError('Error: ' + error.message); setLoading(false); return }
    router.push('/calendario')
    router.refresh()
  }

  const daysLeft = form.due_date ? daysUntilDate(form.due_date) : null

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/calendario" className="p-2 rounded-xl"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Vencimientos</p>
          <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>Nuevo vencimiento</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Evento */}
        <Card label="Detalle del evento">
          <Fi label="Título *" value={form.title} onChange={v => set('title', v)} placeholder="Ej: Renovación certificado BASC" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>
                Fecha límite *
                {daysLeft !== null && (
                  <span className="ml-2 normal-case font-normal"
                    style={{ color: daysLeft < 0 ? '#ff6b6b' : daysLeft <= 7 ? '#ffd93d' : '#40b5fa' }}>
                    {daysLeft < 0 ? `(${Math.abs(daysLeft)}d vencido)` : daysLeft === 0 ? '(hoy)' : `(en ${daysLeft}d)`}
                  </span>
                )}
              </label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}
                onFocus={e => e.target.style.borderColor = 'rgba(64,181,250,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,40,80,0.10)'} />
            </div>
          </div>
        </Card>

        {/* Alertas */}
        <Card label="Alertas automáticas">
          <p className="text-xs" style={{ color: '#6b8fa0' }}>Activar recordatorio con estos días de anticipación:</p>
          <div className="flex gap-3">
            {[{ key: 'alert_15', label: '15 días antes' }, { key: 'alert_7', label: '7 días antes' }, { key: 'alert_1', label: '1 día antes' }].map(a => (
              <button key={a.key} type="button" onClick={() => set(a.key, !form[a.key as keyof typeof form])}
                className="flex-1 py-3 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: form[a.key as keyof typeof form] ? 'rgba(64,181,250,0.15)' : '#f4f7fa',
                  color: form[a.key as keyof typeof form] ? '#40b5fa' : '#6b8fa0',
                  border: `1px solid ${form[a.key as keyof typeof form] ? 'rgba(64,181,250,0.35)' : 'rgba(0,40,80,0.10)'}`,
                }}>
                ⏰ {a.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Vinculación */}
        <Card label="Vincular a (opcional)">
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Cliente</label>
            <select value={form.company_id} onChange={e => set('company_id', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
              <option value="">Sin cliente</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Proyecto</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
              <option value="">Sin proyecto</option>
              {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Detalles adicionales..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
          </div>
        </Card>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/calendario" className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar vencimiento'}
          </button>
        </div>
      </form>
    </div>
  )
}

function daysUntilDate(date: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(date + 'T12:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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

function Fi({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}
        onFocus={e => e.target.style.borderColor = 'rgba(64,181,250,0.5)'}
        onBlur={e => e.target.style.borderColor = 'rgba(0,40,80,0.10)'} />
    </div>
  )
}
