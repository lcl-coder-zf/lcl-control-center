'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const TIPOS_DOC = ['Política', 'Procedimiento', 'Manual', 'Certificado', 'Acta', 'Evidencia', 'Contrato', 'Formato', 'Reporte', 'Otro']

export default function NuevoDocumentoPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', type: 'Procedimiento', company_id: '', project_id: '',
    status: 'pendiente', file_url: '', version: '1.0', expires_at: '',
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
      supabase.from('projects').select('id, name, company_id').eq('status', 'activo').order('name'),
    ]).then(([{ data: c }, { data: p }]) => {
      setCompanies(c ?? [])
      setProjects(p ?? [])
    })
  }, [])

  const filteredProjects = form.company_id
    ? projects.filter(p => p.company_id === form.company_id)
    : projects

  function set(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'company_id') next.project_id = ''
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('documents').insert([{
      name: form.name, type: form.type,
      company_id: form.company_id || null,
      project_id: form.project_id || null,
      status: form.status,
      file_url: form.file_url || null,
      version: form.version || '1.0',
      expires_at: form.expires_at || null,
      uploaded_by: user?.id,
    }])

    if (error) { setError('Error: ' + error.message); setLoading(false); return }
    router.push('/documentos')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/documentos" className="p-2 rounded-xl"
          style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Documentos</p>
          <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>Nuevo documento</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card label="Información del documento">
          <Fi label="Nombre *" value={form.name} onChange={v => set('name', v)} placeholder="Ej: Política de Seguridad BASC v2" />
          <div className="grid grid-cols-2 gap-4">
            <Sel label="Tipo" value={form.type} onChange={v => set('type', v)}>
              {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
            </Sel>
            <Sel label="Estado" value={form.status} onChange={v => set('status', v)}>
              <option value="pendiente">Pendiente</option>
              <option value="aprobado">Aprobado</option>
              <option value="vencido">Vencido</option>
            </Sel>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Fi label="Versión" value={form.version} onChange={v => set('version', v)} placeholder="1.0" />
            <Fi label="Fecha de vencimiento" value={form.expires_at} onChange={v => set('expires_at', v)} type="date" />
          </div>
          <Fi label="URL del archivo (opcional)" value={form.file_url} onChange={v => set('file_url', v)} placeholder="https://drive.google.com/..." />
        </Card>

        <Card label="Vincular a (opcional)">
          <Sel label="Cliente" value={form.company_id} onChange={v => set('company_id', v)}>
            <option value="">Sin cliente</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <Sel label="Proyecto" value={form.project_id} onChange={v => set('project_id', v)}>
            <option value="">Sin proyecto</option>
            {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Sel>
        </Card>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/documentos" className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#40b5fa', color: '#ffffff' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar documento'}
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

function Fi({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
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
