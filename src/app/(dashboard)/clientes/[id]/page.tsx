import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CompanyAvatar } from '@/components/ui/CompanyAvatar'
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, FolderKanban, CheckSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ClienteActions from './ClienteActions'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  activo:    { bg: 'rgba(74,222,128,0.10)',  color: '#4ade80', label: 'Activo' },
  inactivo:  { bg: 'rgba(134,162,178,0.10)', color: '#86a2b2', label: 'Inactivo' },
  suspendido:{ bg: 'rgba(255,107,107,0.10)', color: '#ff6b6b', label: 'Suspendido' },
}

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company } = await supabase.from('companies').select('*').eq('id', id).single()
  if (!company) notFound()

  const [{ data: projects }, { data: tasks }, { data: documents }] = await Promise.all([
    supabase.from('projects').select('id, name, type, status, progress, end_date').eq('company_id', id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('id, title, status, priority, due_date').eq('company_id', id).order('due_date', { ascending: true }).limit(5),
    supabase.from('documents').select('id, name, type, status, expires_at').eq('company_id', id).order('created_at', { ascending: false }).limit(5),
  ])

  const st = STATUS_STYLES[company.status] ?? STATUS_STYLES.inactivo

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/clientes" className="p-2 rounded-xl" style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={48} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>{company.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </div>
            {Array.isArray(company.service_type) && company.service_type.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {company.service_type.map((s: string) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <ClienteActions id={id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#40b5fa' }}>Datos</p>
            <div className="space-y-3">
              {company.nit && <InfoRow label="NIT" value={company.nit} />}
              {company.sector && <InfoRow label="Sector" value={company.sector} />}
              {company.city && <InfoRow label="Ciudad" icon={<MapPin className="w-3.5 h-3.5" />} value={company.city} />}
              {Array.isArray(company.service_type) && company.service_type.length > 0 && (
                <InfoRow label="Servicios" value={company.service_type.join(', ')} />
              )}
              {company.monthly_hours && <InfoRow label="Horas/mes" value={`${company.monthly_hours}h`} />}
              <InfoRow label="Desde" value={formatDate(company.created_at)} />
            </div>
          </div>

          {(company.contact_name || company.contact_email || company.contact_phone) && (
            <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#40b5fa' }}>Contacto</p>
              <div className="space-y-3">
                {company.contact_name && <InfoRow label="Nombre" value={company.contact_name} />}
                {company.contact_email && <InfoRow label="Email" icon={<Mail className="w-3.5 h-3.5" />} value={company.contact_email} />}
                {company.contact_phone && <InfoRow label="Tel" icon={<Phone className="w-3.5 h-3.5" />} value={company.contact_phone} />}
              </div>
            </div>
          )}

          {company.notes && (
            <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#40b5fa' }}>Observaciones</p>
              <p className="text-sm leading-relaxed" style={{ color: '#1a2e3b' }}>{company.notes}</p>
            </div>
          )}
        </div>

        {/* Proyectos + Tareas + Docs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Proyectos */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#40b5fa' }}>
                <FolderKanban className="w-3.5 h-3.5" />Proyectos ({projects?.length ?? 0})
              </p>
              <Link href={`/proyectos/nuevo?cliente=${id}`} className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>+ Nuevo</Link>
            </div>
            {projects && projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map(p => (
                  <Link key={p.id} href={`/proyectos/${p.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-all"
                    style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1a2e3b' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: '#6b8fa0' }}>{p.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
                        <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: '#40b5fa' }} />
                      </div>
                      <span className="text-xs" style={{ color: '#40b5fa' }}>{p.progress}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#6b8fa0' }}>Sin proyectos registrados</p>
            )}
          </div>

          {/* Tareas */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2 mb-4" style={{ color: '#40b5fa' }}>
              <CheckSquare className="w-3.5 h-3.5" />Tareas recientes
            </p>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
                    <p className="text-sm" style={{ color: '#1a2e3b' }}>{t.title}</p>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                      style={{ background: t.status === 'vencida' ? 'rgba(255,107,107,0.12)' : 'rgba(64,181,250,0.10)', color: t.status === 'vencida' ? '#ff6b6b' : '#40b5fa' }}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#6b8fa0' }}>Sin tareas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wide flex-shrink-0" style={{ color: '#6b8fa0' }}>{label}</span>
      <span className="text-xs text-right flex items-center gap-1" style={{ color: '#1a2e3b' }}>
        {icon}{value}
      </span>
    </div>
  )
}
