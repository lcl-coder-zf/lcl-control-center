'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const TIPOS = ['BASC', 'ISO', 'SAGRILAFT', 'PTEE', 'SG-SST', 'Otro']

interface Props {
  companies: { id: string; name: string }[]
  profiles: { id: string; full_name: string }[]
  defaultClienteId?: string
}

export default function NuevoProyectoForm({ companies, profiles, defaultClienteId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_id: defaultClienteId ?? '',
    name: '',
    type: 'BASC',
    status: 'activo',
    progress: 0,
    responsible_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    value: '',
    paid: '',
    risks: '',
    next_action: '',
  })

  function set(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_id) { setError('Selecciona un cliente'); return }
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const payload = {
      company_id: form.company_id,
      name: form.name,
      type: form.type,
      status: form.status,
      progress: Number(form.progress),
      responsible_id: form.responsible_id || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      value: form.value ? Number(form.value) : null,
      paid: form.paid ? Number(form.paid) : 0,
      risks: form.risks || null,
      next_action: form.next_action || null,
    }

    const { error } = await supabase.from('projects').insert([payload])
    if (error) { setError('Error: ' + error.message); setLoading(false); return }
    router.push('/proyectos')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/proyectos" className="p-2 rounded-xl"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Proyectos</p>
          <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>Nuevo proyecto</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* General */}
        <Card label="Información general">
          <Select label="Cliente *" value={form.company_id} onChange={v => set('company_id', v)}>
            <option value="">Seleccionar cliente...</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Field label="Nombre del proyecto *" value={form.name} onChange={v => set('name', v)}
            placeholder="Ej: Implementación BASC 2026" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo" value={form.type} onChange={v => set('type', v)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Estado" value={form.status} onChange={v => set('status', v)}>
              {['activo', 'pausado', 'completado', 'cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Select label="Responsable" value={form.responsible_id} onChange={v => set('responsible_id', v)}>
            <option value="">Sin asignar</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Select>
        </Card>

        {/* Fechas y progreso */}
        <Card label="Fechas y avance">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de inicio" value={form.start_date} onChange={v => set('start_date', v)} type="date" />
            <Field label="Fecha de cierre" value={form.end_date} onChange={v => set('end_date', v)} type="date" />
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

        {/* Finanzas */}
        <Card label="Finanzas">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor del proyecto ($)" value={form.value} onChange={v => set('value', v)} type="number" placeholder="0" />
            <Field label="Valor cobrado ($)" value={form.paid} onChange={v => set('paid', v)} type="number" placeholder="0" />
          </div>
          {form.value && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(64,181,250,0.06)', border: '1px solid rgba(64,181,250,0.15)' }}>
              <span className="text-xs" style={{ color: '#6b8fa0' }}>Saldo pendiente</span>
              <span className="text-sm font-bold" style={{ color: '#40b5fa' }}>
                ${(Number(form.value) - Number(form.paid || 0)).toLocaleString('es-CO')}
              </span>
            </div>
          )}
        </Card>

        {/* Riesgos */}
        <Card label="Seguimiento">
          <Textarea label="Riesgos detectados" value={form.risks} onChange={v => set('risks', v)}
            placeholder="Describe los riesgos o alertas del proyecto..." />
          <Textarea label="Próxima acción" value={form.next_action} onChange={v => set('next_action', v)}
            placeholder="¿Cuál es el siguiente paso concreto?" />
        </Card>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/proyectos" className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Crear proyecto'}
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

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string
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

function Select({ label, value, onChange, children }: {
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

function Textarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
    </div>
  )
}
