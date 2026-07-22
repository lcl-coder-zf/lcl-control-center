'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/types'
import { PageSkeleton } from '@/components/ui/Skeleton'
import {
  Shield, Eye, EyeOff, Loader2, Check,
  LayoutDashboard, Building2, CheckSquare, CalendarClock, Users, KeyRound, Settings, Bell,
} from 'lucide-react'
import PushToggle from '@/components/ui/PushToggle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const MODULES = [
  { key: 'module_clientes',      label: 'Clientes',       icon: Building2,       desc: 'Gestión de clientes y avance por empresa' },
  { key: 'module_tareas',        label: 'Tareas',         icon: CheckSquare,     desc: 'Lista de tareas, subtareas y prioridades' },
  { key: 'module_agenda',        label: 'Agenda',         icon: CalendarClock,   desc: 'Eventos del equipo e indicadores' },
  { key: 'module_equipo',        label: 'Equipo',         icon: Users,           desc: 'Perfiles, evaluaciones y llamados de atención' },
  { key: 'module_vault',         label: 'Vault',          icon: KeyRound,        desc: 'Contraseñas y credenciales seguras' },
  { key: 'module_configuracion', label: 'Configuración',  icon: Settings,        desc: 'Roles, permisos y módulos del sistema' },
]

export default function ConfiguracionPage() {
  const [profiles,    setProfiles]    = useState<Row[]>([])
  const [settings,    setSettings]    = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(true)
  const [savingId,    setSavingId]    = useState<string | null>(null)
  const [savedId,     setSavedId]     = useState<string | null>(null)
  const [savingMod,   setSavingMod]   = useState<string | null>(null)
  const [isAdmin,     setIsAdmin]     = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: me }, { data: p }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user?.id ?? '').single(),
      supabase.from('profiles').select('id, email, full_name, role, oculta_tareas').order('full_name'),
      supabase.from('app_settings').select('key, value'),
    ])
    setIsAdmin(me?.role === 'admin')
    setProfiles(p ?? [])
    setSettings(Object.fromEntries((s ?? []).map(r => [r.key, r.value])))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateProfile(id: string, patch: Record<string, unknown>) {
    setSavingId(id)
    const supabase = createClient()
    await supabase.from('profiles').update(patch).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    setSavingId(null)
    setSavedId(id); setTimeout(() => setSavedId(null), 1500)
  }

  async function toggleModule(key: string) {
    const current = settings[key] ?? 'all'
    const next    = current === 'all' ? 'admin' : 'all'
    setSavingMod(key)
    const supabase = createClient()
    await supabase.from('app_settings').upsert({ key, value: next, updated_at: new Date().toISOString() })
    setSettings(prev => ({ ...prev, [key]: next }))
    setSavingMod(null)
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8 max-w-3xl space-y-10">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Configuración</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Sistema</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>Módulos, roles y permisos del equipo.</p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
          Solo los super admin (Laura y Daniel) pueden cambiar la configuración.
        </div>
      )}

      {/* ── Notificaciones push ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4" style={{ color: '#40b5fa' }} />
          <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Notificaciones push</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>
          Recibe notificaciones en el celular aunque la app esté cerrada. Actívalas en cada dispositivo.
        </p>
        <div className="rounded-2xl px-5 py-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <PushToggle topics={isAdmin ? ['general', 'admin'] : ['general']} />
        </div>
      </section>

      {/* ── Módulos ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard className="w-4 h-4" style={{ color: '#40b5fa' }} />
          <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Módulos</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>
          <b>Todo el equipo</b> = consultores y admins lo ven. <b>Solo admins</b> = solo Laura y Daniel.
        </p>
        <div className="space-y-2">
          {MODULES.map(({ key, label, icon: Icon, desc }) => {
            const value     = settings[key] ?? 'all'
            const adminOnly = value === 'admin'
            const saving    = savingMod === key
            return (
              <div key={key} className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: adminOnly ? 'rgba(255,107,107,0.08)' : 'rgba(64,181,250,0.10)' }}>
                  <Icon className="w-4 h-4" style={{ color: adminOnly ? '#ff6b6b' : '#40b5fa' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1a2e3b' }}>{label}</p>
                  <p className="text-[11px]" style={{ color: '#86a2b2' }}>{desc}</p>
                </div>
                <button
                  disabled={!isAdmin || saving}
                  onClick={() => toggleModule(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                  style={{
                    background: adminOnly ? 'rgba(255,107,107,0.10)' : 'rgba(74,222,128,0.10)',
                    color: adminOnly ? '#ff6b6b' : '#059669',
                    border: `1px solid ${adminOnly ? 'rgba(255,107,107,0.25)' : 'rgba(74,222,128,0.25)'}`,
                    opacity: !isAdmin ? 0.5 : 1,
                  }}>
                  {saving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : adminOnly ? <><Shield className="w-3.5 h-3.5" />Solo admins</> : <><Eye className="w-3.5 h-3.5" />Todo el equipo</>
                  }
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Roles y permisos ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4" style={{ color: '#40b5fa' }} />
          <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Roles y permisos</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>
          · <b>Super admin</b>: ve y administra todo.<br />
          · <b>Consultor</b>: acceso según módulos activos.<br />
          · <b>Tareas ocultas</b>: esconde las tareas de esa persona a los consultores.
        </p>
        <div className="space-y-2">
          {profiles.map(p => {
            const roleLabel = ROLE_LABELS[p.email] ?? (p.role === 'admin' ? 'Super admin' : 'Consultor')
            const initials  = p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={p.id} className="rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap"
                style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                  <p className="text-[11px] truncate" style={{ color: '#6b8fa0' }}>{p.email} · {roleLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] uppercase tracking-wider" style={{ color: '#86a2b2' }}>Rol</label>
                  <select value={p.role} disabled={!isAdmin || savingId === p.id}
                    onChange={e => updateProfile(p.id, { role: e.target.value })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
                    style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                    <option value="admin">Super admin</option>
                    <option value="consultant">Consultor</option>
                  </select>
                </div>
                <button disabled={!isAdmin || savingId === p.id}
                  onClick={() => updateProfile(p.id, { oculta_tareas: !p.oculta_tareas })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: p.oculta_tareas ? 'rgba(255,107,107,0.10)' : '#f4f7fa',
                    color: p.oculta_tareas ? '#ff6b6b' : '#6b8fa0',
                    border: `1px solid ${p.oculta_tareas ? 'rgba(255,107,107,0.25)' : 'rgba(0,40,80,0.10)'}`,
                  }}>
                  {savingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : savedId === p.id ? <Check className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />
                    : p.oculta_tareas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {p.oculta_tareas ? 'Tareas ocultas' : 'Tareas visibles'}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
