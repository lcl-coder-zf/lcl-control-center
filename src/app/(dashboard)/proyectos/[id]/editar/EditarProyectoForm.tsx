'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const TIPOS = ['BASC', 'ISO', 'SAGRILAFT', 'PTEE', 'SG-SST', 'Otro']

export default function EditarProyectoForm({ project, companies, profiles }: {
  project: any
  companies: { id: string; name: string }[]
  profiles: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_id: project.company_id ?? '',
    name: project.name ?? '',
    type: project.type ?? 'BASC',
    status: project.status ?? 'activo',
    progress: project.progress ?? 0,
    responsible_id: project.responsible_id ?? '',
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
    value: project.value?.toString() ?? '',
    paid: project.paid?.toString() ?? '',
    risks: project.risks ?? '',
    next_action: project.next_action ?? '',
  })

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('projects').update({
      ...form,
      progress: Number(form.progress),
      value: form.value ? Number(form.value) : null,
      paid: form.paid ? Number(form.paid) : 0,
      responsible_id: form.responsible_id || null,
      end_date: form.end_date || null,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)

    if (error) { setError('Error: ' + error.message); setLoading(false); return }
    router.push(`/proyectos/${project.id}`)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/proyectos/${project.id}`} className="p-2 rounded-xl"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Proyectos</p>
          <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>Editar proyecto</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card label="Información general">
          <Sel label="Cliente" value={form.company_id} onChange={v => set('company_id', v)}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <Fi label="Nombre *" value={form.name} onChange={v => set('name', v)} />
          <div className="grid grid-cols-2 gap-4">
            <Sel label="Tipo" value={form.type} onChange={v => set('type', v)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </Sel>
            <Sel label="Estado" value={form.status} onChange={v => set('status', v)}>
              {['activo', 'pausado', 'completado', 'cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
            </Sel>
          </div>
          <Sel label="Responsable" value={form.responsible_id} onChange={v => set('responsible_id', v)}>
            <option value="">Sin asignar</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Sel>
        </Card>

        <Card label="Fechas y avance">
          <div className="grid grid-cols-2 gap-4">
            <Fi label="Inicio" value={form.start_date} onChange={v => set('start_date', v)} type="date" />
            <Fi label="Cierre" value={form.end_date} onChange={v => set('end_date', v)} type="date" />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: '#6b8fa0' }}>
              Progreso: <span style={{ color: '#40b5fa' }}>{form.progress}%</span>
            </label>
            <input type="range" min={0} max={100} value={form.progress}
              onChange={e => set('progress', Number(e.target.value))}
              className="w-full accent-blue-400" />
          </div>
        </Card>

        <Card label="Finanzas">
          <div className="grid grid-cols-2 gap-4">
            <Fi label="Valor ($)" value={form.value} onChange={v => set('value', v)} type="number" />
            <Fi label="Cobrado ($)" value={form.paid} onChange={v => set('paid', v)} type="number" />
          </div>
        </Card>

        <Card label="Seguimiento">
          <Ta label="Riesgos" value={form.risks} onChange={v => set('risks', v)} />
          <Ta label="Próxima acción" value={form.next_action} onChange={v => set('next_action', v)} />
        </Card>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href={`/proyectos/${project.id}`} className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar cambios'}
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

function Fi({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
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

function Sel({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
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

function Ta({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
    </div>
  )
}
