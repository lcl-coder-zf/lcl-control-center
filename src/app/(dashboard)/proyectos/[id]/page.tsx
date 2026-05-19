import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, CheckSquare, CalendarClock, AlertTriangle } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import ProyectoActions from './ProyectoActions'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  activo:     { bg: 'rgba(64,181,250,0.10)',  color: '#40b5fa', label: 'Activo' },
  completado: { bg: 'rgba(74,222,128,0.10)',  color: '#4ade80', label: 'Completado' },
  pausado:    { bg: 'rgba(255,217,61,0.10)',  color: '#ffd93d', label: 'Pausado' },
  cancelado:  { bg: 'rgba(255,107,107,0.10)', color: '#ff6b6b', label: 'Cancelado' },
}

const TYPE_COLORS: Record<string, string> = {
  BASC: '#40b5fa', ISO: '#a78bfa', SAGRILAFT: '#fb923c',
  PTEE: '#34d399', 'SG-SST': '#f472b6', Otro: '#86a2b2',
}

export default async function ProyectoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, companies(id, name), profiles(id, full_name)')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const [{ data: tasks }, { data: events }] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', id).order('due_date'),
    supabase.from('calendar_events').select('*').eq('project_id', id).order('due_date'),
  ])

  const st = STATUS_STYLES[project.status] ?? STATUS_STYLES.activo
  const typeColor = TYPE_COLORS[project.type] ?? '#86a2b2'
  const pendiente = (project.value ?? 0) - (project.paid ?? 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/proyectos" className="p-2 rounded-xl"
            style={{ background: '#f4f7fa', color: '#6b8fa0' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black"
            style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30` }}>
            {project.type}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black" style={{ color: '#1a2e3b' }}>{project.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: st.bg, color: st.color }}>
                {st.label}
              </span>
            </div>
            {project.companies?.name && (
              <Link href={`/clientes/${project.companies.id}`} className="text-sm hover:underline" style={{ color: '#6b8fa0' }}>
                {project.companies.name}
              </Link>
            )}
          </div>
        </div>
        <ProyectoActions id={id} />
      </div>

      {/* Progreso */}
      <div className="rounded-2xl p-5 mb-6"
        style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider" style={{ color: '#6b8fa0' }}>Avance del proyecto</span>
          <span className="text-2xl font-black" style={{ color: typeColor }}>{project.progress}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, background: typeColor }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info lateral */}
        <div className="space-y-4">
          {/* Datos */}
          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Datos</p>
            <Row label="Tipo" value={project.type} />
            {project.profiles?.full_name && <Row label="Responsable" value={project.profiles.full_name} />}
            {project.start_date && <Row label="Inicio" value={formatDate(project.start_date)} />}
            {project.end_date && <Row label="Cierre" value={formatDate(project.end_date)} />}
          </div>

          {/* Finanzas */}
          {project.value && (
            <div className="rounded-2xl p-5 space-y-3"
              style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#40b5fa' }}>Finanzas</p>
              <Row label="Valor" value={formatCurrency(project.value)} />
              <Row label="Cobrado" value={formatCurrency(project.paid ?? 0)} color="#4ade80" />
              <div className="h-px" style={{ background: 'rgba(0,40,80,0.08)' }} />
              <Row label="Pendiente" value={formatCurrency(pendiente)} color={pendiente > 0 ? '#ffd93d' : '#4ade80'} />
            </div>
          )}

          {/* Riesgos */}
          {project.risks && (
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.2)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2 mb-2"
                style={{ color: '#ff6b6b' }}>
                <AlertTriangle className="w-3.5 h-3.5" />Riesgos
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#1a2e3b' }}>{project.risks}</p>
            </div>
          )}

          {/* Próxima acción */}
          {project.next_action && (
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(64,181,250,0.05)', border: '1px solid rgba(64,181,250,0.2)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#40b5fa' }}>
                Próxima acción
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#1a2e3b' }}>{project.next_action}</p>
            </div>
          )}
        </div>

        {/* Tareas y eventos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tareas */}
          <div className="rounded-2xl p-5"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#40b5fa' }}>
                <CheckSquare className="w-3.5 h-3.5" />Tareas ({tasks?.length ?? 0})
              </p>
              <Link href={`/tareas/nueva?proyecto=${id}`} className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>+ Nueva</Link>
            </div>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
                    <div>
                      <p className="text-sm" style={{ color: '#1a2e3b' }}>{t.title}</p>
                      <p className="text-xs" style={{ color: '#6b8fa0' }}>{formatDate(t.due_date)}</p>
                    </div>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                      style={{
                        background: t.status === 'vencida' ? 'rgba(255,107,107,0.12)' : t.status === 'completada' ? 'rgba(74,222,128,0.10)' : 'rgba(64,181,250,0.10)',
                        color: t.status === 'vencida' ? '#ff6b6b' : t.status === 'completada' ? '#4ade80' : '#40b5fa',
                      }}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: '#6b8fa0' }}>Sin tareas asignadas</p>
            )}
          </div>

          {/* Vencimientos */}
          <div className="rounded-2xl p-5"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#40b5fa' }}>
                <CalendarClock className="w-3.5 h-3.5" />Vencimientos ({events?.length ?? 0})
              </p>
              <Link href={`/calendario/nuevo?proyecto=${id}`} className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>+ Nuevo</Link>
            </div>
            {events && events.length > 0 ? (
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
                    <div>
                      <p className="text-sm" style={{ color: '#1a2e3b' }}>{ev.title}</p>
                      <p className="text-xs capitalize" style={{ color: '#6b8fa0' }}>{ev.type}</p>
                    </div>
                    <span className="text-xs" style={{ color: '#ffd93d' }}>{formatDate(ev.due_date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: '#6b8fa0' }}>Sin vencimientos registrados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wide" style={{ color: '#6b8fa0' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: color ?? '#1a2e3b' }}>{value}</span>
    </div>
  )
}
