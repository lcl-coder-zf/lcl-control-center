'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/types'
import { Users, Cake, PartyPopper, AlertTriangle } from 'lucide-react'
import { PageSkeleton } from '@/components/ui/Skeleton'
import EmployeePanel from '@/components/equipo/EmployeePanel'
import SeguimientoPerfiles from '@/components/equipo/SeguimientoPerfiles'
import { isOverdue } from '@/lib/tasks'
import { diasACumple, cumpleLabel, aniversario, completitud } from '@/lib/perfil'

// Iniciales con un anillo que se llena según el % de perfil completo
function AvatarProgreso({ initials, pct }: { initials: string; pct: number }) {
  const r = 24, c = 2 * Math.PI * r
  return (
    <div className="relative w-[52px] h-[52px] flex-shrink-0" title={`Perfil ${pct}% completo`}>
      <svg width="52" height="52" className="absolute inset-0 -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,40,80,0.07)" strokeWidth="2.5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={pct === 100 ? '#4ade80' : '#40b5fa'} strokeWidth="2.5"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-[5px] rounded-full flex items-center justify-center text-sm font-black"
        style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
    </div>
  )
}

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
        sb.from('profiles').select('*').order('full_name'),
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

  // Franja superior: próximos cumpleaños / aniversarios (60 días) y quién va con más vencidas
  const proximos = profiles.flatMap(p => {
    const out: { id: string; nombre: string; dias: number; tipo: 'cumple' | 'aniv'; texto: string }[] = []
    const c = diasACumple(p)
    if (c !== null && c <= 60) out.push({ id: p.id + 'c', nombre: p.full_name, dias: c, tipo: 'cumple', texto: cumpleLabel(p) })
    const a = aniversario(p)
    if (a && a.dias <= 60) out.push({ id: p.id + 'a', nombre: p.full_name, dias: a.dias, tipo: 'aniv', texto: `${a.anos} año${a.anos !== 1 ? 's' : ''} en LCL` })
    return out
  }).sort((a, b) => a.dias - b.dias)
  const conVencidas = profiles
    .map(p => ({ nombre: p.full_name, n: workload(p.id).vencidas }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3)
  const cuando = (d: number) => d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 05</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Equipo</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>{profiles.length} personas · Haz clic para ver el perfil completo</p>
      </div>

      {currentRole === 'admin' && (
        <SeguimientoPerfiles profiles={profiles}
          onUpdated={(id, patch) => setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))} />
      )}

      {(proximos.length > 0 || conVencidas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#86a2b2' }}>
              <PartyPopper className="w-3.5 h-3.5" /> Próximas fechas
            </p>
            {proximos.length === 0
              ? <p className="text-xs" style={{ color: '#b0bcc7' }}>Nada en los próximos 60 días</p>
              : <div className="space-y-1.5">
                  {proximos.slice(0, 4).map(x => (
                    <div key={x.id} className="flex items-center gap-2 text-xs">
                      {x.tipo === 'cumple'
                        ? <Cake className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f472b6' }} />
                        : <PartyPopper className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#40b5fa' }} />}
                      <span className="font-semibold truncate" style={{ color: '#1a2e3b' }}>{x.nombre}</span>
                      <span className="truncate" style={{ color: '#6b8fa0' }}>· {x.texto}</span>
                      <span className="ml-auto flex-shrink-0 font-semibold" style={{ color: x.dias <= 7 ? '#f472b6' : '#86a2b2' }}>{cuando(x.dias)}</span>
                    </div>
                  ))}
                </div>}
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#86a2b2' }}>
              <AlertTriangle className="w-3.5 h-3.5" /> Más tareas vencidas
            </p>
            {conVencidas.length === 0
              ? <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>Nadie tiene tareas vencidas 🎉</p>
              : <div className="space-y-1.5">
                  {conVencidas.map(x => (
                    <div key={x.nombre} className="flex items-center gap-2 text-xs">
                      <span className="font-semibold truncate" style={{ color: '#1a2e3b' }}>{x.nombre}</span>
                      <span className="ml-auto font-bold flex-shrink-0" style={{ color: '#ff6b6b' }}>{x.n} vencida{x.n !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(p => {
          const initials  = p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          const title     = ROLE_LABELS[p.email] ?? (p.role === 'admin' ? 'Administrador' : 'Consultor')
          const wl        = workload(p.id)
          const cumple    = diasACumple(p)
          const aniv      = aniversario(p)
          return (
            <button key={p.id} onClick={() => setSelected(p)} className="text-left transition-all rounded-2xl p-5"
              style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(64,181,250,0.35)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(64,181,250,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,40,80,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
              <div className="flex items-center gap-3 mb-3">
                <AvatarProgreso initials={initials} pct={completitud(p)} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                  <p className="text-[11px] truncate" style={{ color: '#6b8fa0' }}>{title}</p>
                  {p.profesion && <p className="text-[10px] truncate" style={{ color: '#86a2b2' }}>{p.profesion}</p>}
                </div>
                {cumple !== null && cumple <= 7 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 flex-shrink-0"
                    style={{ background: 'rgba(244,114,182,0.12)', color: '#db2777' }} title={`Cumpleaños ${cumpleLabel(p)}`}>
                    <Cake className="w-3 h-3" />{cuando(cumple)}
                  </span>
                )}
                {aniv && aniv.dias <= 7 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 flex-shrink-0"
                    style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }} title={`${aniv.anos} año(s) en LCL`}>
                    <PartyPopper className="w-3 h-3" />{aniv.anos}a
                  </span>
                )}
              </div>
              {p.bio && <p className="text-xs mb-3 line-clamp-2" style={{ color: '#4a5a6b' }}>{p.bio}</p>}
              {(p.especialidades ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.especialidades.slice(0, 3).map((e: string) => (
                    <span key={e} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                      style={{ background: 'rgba(64,181,250,0.10)', color: '#2a9ae0' }}>{e}</span>
                  ))}
                  {p.especialidades.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5" style={{ color: '#86a2b2' }}>+{p.especialidades.length - 3}</span>
                  )}
                </div>
              )}
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
