import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, CalendarClock, User, LayoutDashboard } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CompanyAvatar } from '@/components/ui/CompanyAvatar'
import { ROLE_LABELS } from '@/types'
import ProyectoActions from './ProyectoActions'
import ProyectoHub from './ProyectoHub'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  activo:     { bg: 'rgba(64,181,250,0.10)',  color: '#40b5fa', label: 'Activo' },
  completado: { bg: 'rgba(74,222,128,0.10)',  color: '#4ade80', label: 'Completado' },
  pausado:    { bg: 'rgba(255,217,61,0.10)',  color: '#ffd93d', label: 'Pausado' },
  cancelado:  { bg: 'rgba(255,107,107,0.10)', color: '#ff6b6b', label: 'Cancelado' },
}

export default async function ProyectoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: project }, { data: currentProfile }, { data: profiles }] = await Promise.all([
    supabase.from('projects').select('*, companies(id, name, logo_url, service_type, city), profiles(id, full_name, email)').eq('id', id).single(),
    supabase.from('profiles').select('id, email, role').eq('id', user?.id ?? '').single(),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  if (!project) notFound()

  const { data: tasks } = await supabase
    .from('tasks').select('*, profiles!tasks_assigned_to_fkey(id, full_name)').eq('project_id', id).order('due_date')

  const st = STATUS_STYLES[project.status] ?? STATUS_STYLES.activo
  const canEdit = currentProfile?.role === 'admin'
  const services: string[] = Array.isArray(project.companies?.service_type) ? project.companies.service_type : []

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col gap-2 mt-1">
            <Link href="/proyectos" className="p-2 rounded-xl" title="Volver a proyectos"
              style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link href="/dashboard" className="p-2 rounded-xl" title="Ir al Dashboard"
              style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
              <LayoutDashboard className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex items-start gap-4">
            <CompanyAvatar name={project.companies?.name ?? project.name} logoUrl={project.companies?.logo_url} size={52} />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>{project.name}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              {project.companies?.name && (
                <Link href={`/clientes/${project.companies.id}`}
                  className="text-sm font-medium hover:underline" style={{ color: '#6b8fa0' }}>
                  {project.companies.name}
                </Link>
              )}
              {services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {services.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(167,139,250,0.10)', color: '#a78bfa' }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {canEdit && <ProyectoActions id={id} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Datos</p>

            {project.profiles?.full_name && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs uppercase tracking-wide flex-shrink-0 flex items-center gap-1" style={{ color: '#6b8fa0' }}>
                  <User className="w-3 h-3" />Responsable
                </span>
                <span className="text-xs font-semibold text-right" style={{ color: '#1a2e3b' }}>
                  {project.profiles.full_name}
                  {project.profiles.email && (
                    <span className="block text-[10px] font-normal" style={{ color: '#6b8fa0' }}>
                      {ROLE_LABELS[project.profiles.email] ?? ''}
                    </span>
                  )}
                </span>
              </div>
            )}

            {project.companies?.city && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide flex items-center gap-1" style={{ color: '#6b8fa0' }}>
                  <MapPin className="w-3 h-3" />Ciudad
                </span>
                <span className="text-xs font-semibold" style={{ color: '#1a2e3b' }}>{project.companies.city}</span>
              </div>
            )}

            {project.start_date && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide flex items-center gap-1" style={{ color: '#6b8fa0' }}>
                  <CalendarClock className="w-3 h-3" />Inicio
                </span>
                <span className="text-xs font-semibold" style={{ color: '#1a2e3b' }}>{formatDate(project.start_date)}</span>
              </div>
            )}

            {project.end_date && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide" style={{ color: '#6b8fa0' }}>Cierre</span>
                <span className="text-xs font-semibold" style={{ color: '#ffd93d' }}>{formatDate(project.end_date)}</span>
              </div>
            )}
          </div>

          {canEdit && (
            <Link href={`/proyectos/${id}/editar`}
              className="block w-full text-center py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
              Editar proyecto
            </Link>
          )}
        </div>

        {/* Hub principal */}
        <div className="lg:col-span-3">
          <ProyectoHub
            projectId={id}
            companyId={project.company_id}
            initialProgress={project.progress ?? 0}
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
