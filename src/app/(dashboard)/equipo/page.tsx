'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/types'
import { Users } from 'lucide-react'
import { PageSkeleton } from '@/components/ui/Skeleton'
import EmployeePanel from '@/components/equipo/EmployeePanel'
import { isOverdue } from '@/lib/tasks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

export default function EquipoPage() {
  const [profiles,    setProfiles]    = useState<Row[]>([])
  const [tasks,       setTasks]       = useState<Row[]>([])
  const [selected,    setSelected]    = useState<Row | null>(null)
  const [currentRole, setCurrentRole] = useState<string>('consultant')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [{ data: me }, { data: p }, { data: t }] = await Promise.all([
        sb.auth.getUser(),
        sb.from('profiles').select('id, email, full_name, role, bio, start_date, phone').order('full_name'),
        sb.from('tasks').select('id, assigned_to, status, due_date, task_type').is('parent_id', null),
      ])
      if (me.user) {
        const { data: myProfile } = await sb.from('profiles').select('role').eq('id', me.user.id).single()
        setCurrentRole(myProfile?.role ?? 'consultant')
      }
      setProfiles(p ?? [])
      setTasks(t ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageSkeleton />

  // Carga de trabajo: tareas abiertas partidas en vencidas / en progreso / pendientes al día
  const workload = (id: string) => {
    const open = tasks.filter(t => t.assigned_to === id && t.status !== 'completada' && t.status !== 'cancelada')
    const vencidas   = open.filter(isOverdue).length
    const enProgreso = open.filter(t => !isOverdue(t) && t.status === 'en_progreso').length
    return { total: open.length, vencidas, enProgreso, pendientes: open.length - vencidas - enProgreso }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 05</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Equipo</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>{profiles.length} personas · Haz clic para ver el perfil completo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(p => {
          const initials  = p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          const title     = ROLE_LABELS[p.email] ?? (p.role === 'admin' ? 'Administrador' : 'Consultor')
          const wl        = workload(p.id)
          return (
            <button key={p.id} onClick={() => setSelected(p)} className="text-left transition-all rounded-2xl p-5"
              style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(64,181,250,0.35)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(64,181,250,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,40,80,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                  <p className="text-[11px] truncate" style={{ color: '#6b8fa0' }}>{title}</p>
                </div>
              </div>
              {p.bio && <p className="text-xs mb-3 line-clamp-2" style={{ color: '#4a5a6b' }}>{p.bio}</p>}
              {/* Barra de carga: rojo vencidas · morado en progreso · azul pendientes */}
              {wl.total > 0 ? (
                <div className="mb-2">
                  <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,40,80,0.07)' }}>
                    {[
                      { n: wl.vencidas,   color: '#ff6b6b' },
                      { n: wl.enProgreso, color: '#a78bfa' },
                      { n: wl.pendientes, color: '#40b5fa' },
                    ].map((seg, i) => seg.n > 0 && (
                      <div key={i} style={{ width: `${(seg.n / wl.total) * 100}%`, background: seg.color }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2.5 mt-1.5 text-[10px] font-semibold">
                    {wl.vencidas > 0 && <span style={{ color: '#ff6b6b' }}>{wl.vencidas} vencida{wl.vencidas !== 1 ? 's' : ''}</span>}
                    {wl.enProgreso > 0 && <span style={{ color: '#a78bfa' }}>{wl.enProgreso} en progreso</span>}
                    {wl.pendientes > 0 && <span style={{ color: '#40b5fa' }}>{wl.pendientes} pendiente{wl.pendientes !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] mb-2 font-semibold" style={{ color: '#4ade80' }}>Al día · sin tareas abiertas</p>
              )}
              {p.start_date && (
                <span className="text-[10px]" style={{ color: '#b0bcc7' }}>
                  Desde {new Date(p.start_date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {profiles.length === 0 && (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
          <Users className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
          <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin miembros de equipo</p>
        </div>
      )}

      {selected && (
        <EmployeePanel profile={selected} currentUserRole={currentRole} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
