'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Upload, X, FileText } from 'lucide-react'
import Link from 'next/link'

const TIPOS_DOC = ['Política', 'Procedimiento', 'Manual', 'Certificado', 'Acta', 'Evidencia', 'Contrato', 'Formato', 'Reporte', 'Otro']

export default function NuevoDocumentoPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'Procedimiento', company_id: '', project_id: '',
    status: 'pendiente', version: '1.0', expires_at: '',
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

  async function uploadFile(file: File): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const folder = form.company_id || 'general'
    const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { data, error } = await supabase.storage.from('documents').upload(filename, file)
    if (error) { setError('Error al subir archivo: ' + error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(data.path)
    return publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    setError('')

    let file_url: string | null = null

    if (file) {
      setUploading(true)
      file_url = await uploadFile(file)
      setUploading(false)
      if (!file_url) { setLoading(false); return }
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('documents').insert([{
      name: form.name, type: form.type,
      company_id: form.company_id || null,
      project_id: form.project_id || null,
      status: form.status,
      file_url,
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
        </Card>

        <Card label="Archivo">
          {file ? (
            <div className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(64,181,250,0.06)', border: '1px solid rgba(64,181,250,0.20)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{file.name}</p>
                <p className="text-xs" style={{ color: '#6b8fa0' }}>{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button type="button" onClick={() => setFile(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,107,107,0.10)', color: '#ff6b6b' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
              style={{ background: '#f4f7fa', border: '2px dashed rgba(0,40,80,0.12)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: '#1a2e3b' }}>Arrastra un archivo o haz clic para seleccionar</p>
                <p className="text-xs mt-1" style={{ color: '#6b8fa0' }}>PDF, Word, Excel, imágenes — máx. 50 MB</p>
              </div>
              <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
            </label>
          )}
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
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{uploading ? 'Subiendo archivo...' : 'Guardando...'}</>
              : 'Guardar documento'}
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
