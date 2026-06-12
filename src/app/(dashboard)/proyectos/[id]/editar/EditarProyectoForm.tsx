'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function EditarProyectoForm({ project, companies, profiles }: {
  project: any
  companies: { id: string; name: string; service_type: string[] }[]
  profiles: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_id: project.company_id ?? '',
    name: project.name ?? '',
    status: project.status ?? 'activo',
    progress: project.progress ?? 0,
    responsible_id: project.responsible_id ?? '',
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
  })

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const selectedCompany = companies.find(c => c.id === form.company_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.from('projects').update({
      company_id: form.company_id,
      name: form.name,
      status: form.status,
      progress: Number(form.progress),
      responsible_id: form.responsible_id || null,
      start_date: form.start_date,
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
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Información general</p>

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Cliente</label>
            <select value={form.company_id} onChange={e => set('company_id', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedCompany?.service_type?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedCompany.service_type.map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(167,139,250,0.10)', color: '#a78bfa' }}>{s}</span>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}
              onFocus={e => e.target.style.borderColor = 'rgba(64,181,250,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,40,80,0.10)'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                {['activo', 'pausado', 'completado', 'cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Responsable</label>
              <select value={form.responsible_id} onChange={e => set('responsible_id', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                <option value="">Sin asignar</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Fechas y avance</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Inicio</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>Cierre</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: '#6b8fa0' }}>
              Avance: <span style={{ color: '#40b5fa' }}>{form.progress}%</span>
            </label>
            <input type="range" min={0} max={100} value={form.progress}
              onChange={e => set('progress', Number(e.target.value))}
              className="w-full accent-blue-400" />
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href={`/proyectos/${project.id}`}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
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
