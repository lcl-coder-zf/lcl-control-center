'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const SERVICIOS = ['BASC', 'ISO', 'SAGRILAFT', 'PTEE', 'SG-SST', 'Múltiples', 'Otro']
const SECTORES = ['Transporte', 'Logística', 'Comercio', 'Manufactura', 'Servicios', 'Inversiones', 'Otro']

export default function NuevoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', nit: '', sector: '', city: '',
    contact_name: '', contact_email: '', contact_phone: '',
    service_type: '', status: 'activo', notes: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.from('companies').insert([form])

    if (error) { setError('Error al guardar: ' + error.message); setLoading(false); return }
    router.push('/clientes')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/clientes" className="p-2 rounded-xl transition-all"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Clientes</p>
          <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>Nuevo cliente</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección empresa */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#40b5fa' }}>
            Datos de la empresa
          </p>

          <Field label="Nombre *" value={form.name} onChange={v => set('name', v)} placeholder="Ej: Colfletar SAS" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="NIT" value={form.nit} onChange={v => set('nit', v)} placeholder="900.123.456-7" />
            <Field label="Ciudad" value={form.city} onChange={v => set('city', v)} placeholder="Bogotá" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Sector" value={form.sector} onChange={v => set('sector', v)} options={SECTORES} />
            <Select label="Servicio contratado" value={form.service_type} onChange={v => set('service_type', v)} options={SERVICIOS} />
          </div>
          <Select label="Estado" value={form.status} onChange={v => set('status', v)}
            options={['activo', 'inactivo', 'suspendido']} />
        </div>

        {/* Contacto */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#40b5fa' }}>
            Contacto principal
          </p>
          <Field label="Nombre del contacto" value={form.contact_name} onChange={v => set('contact_name', v)} placeholder="Nombre completo" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" value={form.contact_email} onChange={v => set('contact_email', v)} placeholder="contacto@empresa.com" type="email" />
            <Field label="Teléfono" value={form.contact_phone} onChange={v => set('contact_phone', v)} placeholder="300 000 0000" />
          </div>
        </div>

        {/* Notas */}
        <div className="rounded-2xl p-6"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#6b8fa0' }}>
            Observaciones
          </label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Notas internas sobre este cliente..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/clientes" className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-all"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}
        onFocus={e => e.target.style.borderColor = 'rgba(64,181,250,0.5)'}
        onBlur={e => e.target.style.borderColor = 'rgba(0,40,80,0.10)'} />
    </div>
  )
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
