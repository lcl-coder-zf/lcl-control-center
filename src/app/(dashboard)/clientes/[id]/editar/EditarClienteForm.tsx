'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Camera } from 'lucide-react'
import Link from 'next/link'
import type { Company } from '@/types'

const SERVICIOS = ['Asesoría BASC', 'ISO', 'SAGRILAFT', 'SARLAFT', 'PTEE', 'SG-SST', 'Oficial de Cumplimiento', 'Asesoría Legal', 'Diplomado en Vivo', 'Diplomado Virtual', 'Seminarios', 'Capacitaciones', 'Otro']
const SECTORES = ['Transporte', 'Transporte Terrestre', 'Transporte de Pasajeros', 'Operador Logístico', 'Agente de Carga', 'Agente de Carga Internacional', 'Logística', 'Comercio', 'Comercialización de Metales Preciosos', 'Venta de Lotes', 'Construcción', 'Manufactura', 'Servicios', 'Inversiones', 'Arrendamientos', 'Académico', 'Otro']

export default function EditarClienteForm({ company }: { company: Company }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url ?? null)
  const [form, setForm] = useState({
    name: company.name,
    nit: company.nit ?? '',
    sector: company.sector ?? '',
    city: company.city ?? '',
    contact_name: company.contact_name ?? '',
    contact_email: company.contact_email ?? '',
    contact_phone: company.contact_phone ?? '',
    service_type: Array.isArray(company.service_type) ? company.service_type : [],
    monthly_hours: company.monthly_hours?.toString() ?? '',
    status: company.status,
    notes: company.notes ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  async function uploadLogo(file: File): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${company.id}.${ext}`
    const { data, error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(data.path)
    return publicUrl
  }

  function toggleServicio(s: string) {
    setForm(prev => ({
      ...prev,
      service_type: prev.service_type.includes(s)
        ? prev.service_type.filter(x => x !== s)
        : [...prev.service_type, s],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    let logo_url = company.logo_url ?? null
    if (logoFile) logo_url = await uploadLogo(logoFile)

    const { error } = await supabase.from('companies').update({
      name: form.name, nit: form.nit, sector: form.sector, city: form.city,
      contact_name: form.contact_name, contact_email: form.contact_email, contact_phone: form.contact_phone,
      service_type: form.service_type,
      monthly_hours: form.monthly_hours ? parseInt(form.monthly_hours) : null,
      logo_url,
      status: form.status, notes: form.notes,
      updated_at: new Date().toISOString(),
    }).eq('id', company.id)
    if (error) { setError('Error al guardar: ' + error.message); setLoading(false); return }
    router.push(`/clientes/${company.id}`)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/clientes/${company.id}`} className="p-2 rounded-xl"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Clientes</p>
          <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>Editar: {company.name}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Datos de la empresa</p>

          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-black text-xl"
                style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-0.5" />
                  : company.name.slice(0, 2).toUpperCase()}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: '#40b5fa' }}>
                <Camera className="w-3 h-3 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#1a2e3b' }}>Logo de la empresa</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b8fa0' }}>PNG, JPG — recomendado 200×200px</p>
            </div>
          </div>

          <Field label="Nombre *" value={form.name} onChange={v => set('name', v)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="NIT" value={form.nit} onChange={v => set('nit', v)} />
            <Field label="Ciudad" value={form.city} onChange={v => set('city', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Sector" value={form.sector} onChange={v => set('sector', v)} options={SECTORES} />
            <Select label="Estado" value={form.status} onChange={v => set('status', v)} options={['activo', 'inactivo', 'suspendido']} />
          </div>
        </div>

        <div className="rounded-2xl p-6 space-y-3"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>
            Servicios contratados
            {form.service_type.length > 0 && (
              <span className="ml-2 normal-case font-normal" style={{ color: '#6b8fa0' }}>
                ({form.service_type.length} seleccionado{form.service_type.length > 1 ? 's' : ''})
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SERVICIOS.map(s => {
              const active = form.service_type.includes(s)
              return (
                <button key={s} type="button" onClick={() => toggleServicio(s)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
                  style={{
                    background: active ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
                    border: `1px solid ${active ? 'rgba(64,181,250,0.35)' : 'rgba(0,40,80,0.08)'}`,
                    color: active ? '#40b5fa' : '#6b8fa0',
                  }}>
                  <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: active ? '#40b5fa' : 'rgba(0,40,80,0.08)', color: active ? '#fff' : 'transparent' }}>
                    ✓
                  </span>
                  {s}
                </button>
              )
            })}
          </div>
          <Field label="Dedicación mensual (horas)" value={form.monthly_hours} onChange={v => set('monthly_hours', v)} placeholder="Ej: 32" type="number" />
        </div>

        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Contacto</p>
          <Field label="Nombre" value={form.contact_name} onChange={v => set('contact_name', v)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" value={form.contact_email} onChange={v => set('contact_email', v)} type="email" />
            <Field label="Teléfono" value={form.contact_phone} onChange={v => set('contact_phone', v)} />
          </div>
        </div>

        <div className="rounded-2xl p-6"
          style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#6b8fa0' }}>Observaciones</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
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
          <Link href={`/clientes/${company.id}`} className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
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

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
