import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CompanyAvatar } from '@/components/ui/CompanyAvatar'
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ClienteActions from './ClienteActions'
import ClienteTareas from './ClienteTareas'

// Sin caché: siempre traer las tareas frescas del cliente.
export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  activo:    { bg: 'rgba(74,222,128,0.10)',  color: '#4ade80', label: 'Activo' },
  inactivo:  { bg: 'rgba(134,162,178,0.10)', color: '#86a2b2', label: 'Inactivo' },
  suspendido:{ bg: 'rgba(255,107,107,0.10)', color: '#ff6b6b', label: 'Suspendido' },
}

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: company } = await supabase.from('companies').select('*').eq('id', id).single()
  if (!company) notFound()

  const [{ data: tasks }, { data: profiles }, { data: currentProfile }] = await Promise.all([
    supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(id, full_name)').eq('company_id', id).order('due_date', { ascending: true }),
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('profiles').select('id, role').eq('id', user?.id ?? '').single(),
  ])

  const canEdit = currentProfile?.role === 'admin'
  const st = STATUS_STYLES[company.status] ?? STATUS_STYLES.inactivo

  return (
    <div className="p-4 lg:p-8">
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

        {/* Tareas del cliente */}
        <div className="lg:col-span-2">
          <ClienteTareas
            companyId={id}
            companyName={company.name}
            initialTasks={tasks ?? []}
            profiles={profiles ?? []}
            canEdit={canEdit}
            userId={user?.id ?? ''}
          />
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
