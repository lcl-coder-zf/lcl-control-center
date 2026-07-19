'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/types'
import { Users } from 'lucide-react'
import { PageSkeleton } from '@/components/ui/Skeleton'
import EmployeePanel from '@/components/equipo/EmployeePanel'

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
        sb.from('tasks').select('id, assigned_to, status').is('parent_id', null),
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

  const taskCount = (id: string) => tasks.filter(t => t.assigned_to === id && t.status !== 'completada').length

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
          const pending   = taskCount(p.id)
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
              <div className="flex items-center justify-between">
                {p.start_date
                  ? <span className="text-[10px]" style={{ color: '#b0bcc7' }}>
                      Desde {new Date(p.start_date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                    </span>
                  : <span />
                }
                {pending > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
                    {pending} tarea{pending !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
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
