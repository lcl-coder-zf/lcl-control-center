'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/types'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { Shield, Eye, EyeOff, Loader2, Check } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

export default function ConfiguracionPage() {
  const [profiles, setProfiles] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').single()
    setIsAdmin(me?.role === 'admin')
    const { data } = await supabase.from('profiles').select('id, email, full_name, role, oculta_tareas').order('full_name')
    setProfiles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function update(id: string, patch: Record<string, unknown>) {
    setSavingId(id)
    const supabase = createClient()
    await supabase.from('profiles').update(patch).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    setSavingId(null)
    setSavedId(id); setTimeout(() => setSavedId(null), 1500)
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Configuración</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Roles y permisos</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>Gestiona el rol de cada persona y qué tareas puede ver.</p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl px-4 py-3 text-sm mb-6" style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b' }}>
          Solo los super admin (Laura y Daniel) pueden cambiar roles.
        </div>
      )}

      {/* Leyenda */}
      <div className="rounded-2xl p-4 mb-5 text-xs leading-relaxed" style={{ background: 'rgba(64,181,250,0.05)', border: '1px solid rgba(64,181,250,0.15)', color: '#4a5a6b' }}>
        <p className="flex items-center gap-1.5 font-semibold mb-1" style={{ color: '#1a2e3b' }}><Shield className="w-3.5 h-3.5" style={{ color: '#40b5fa' }} />Cómo funciona</p>
        <p>· <b>Super admin</b>: ve y administra todo.</p>
        <p>· <b>Consultor</b>: ve las tareas de todos, <b>excepto</b> las de personas con “tareas ocultas”.</p>
        <p>· El toggle <b>Tareas ocultas</b> esconde las tareas de esa persona a los consultores (activado en Laura).</p>
      </div>

      <div className="space-y-2">
        {profiles.map(p => {
          const roleLabel = ROLE_LABELS[p.email] ?? (p.role === 'admin' ? 'Super admin' : 'Consultor')
          const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div key={p.id} className="rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                <p className="text-[11px] truncate" style={{ color: '#6b8fa0' }}>{p.email} · {roleLabel}</p>
              </div>

              {/* Rol */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-wider" style={{ color: '#86a2b2' }}>Rol</label>
                <select value={p.role} disabled={!isAdmin || savingId === p.id}
                  onChange={e => update(p.id, { role: e.target.value })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
                  style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                  <option value="admin">Super admin</option>
                  <option value="consultant">Consultor</option>
                </select>
              </div>

              {/* Tareas ocultas */}
              <button disabled={!isAdmin || savingId === p.id}
                onClick={() => update(p.id, { oculta_tareas: !p.oculta_tareas })}
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
    </div>
  )
}
