'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, type RolApp } from '@/types'
import { MODULOS, modulosDefaultDeRol } from '@/lib/modulos'
import { PageSkeleton } from '@/components/ui/Skeleton'
import {
  Shield, Eye, EyeOff, Loader2, Check, Power,
  LayoutDashboard, UserCircle, Pencil, CreditCard, Phone, CalendarDays,
  Bell, UserPlus, Plus, Trash2,
} from 'lucide-react'
import PushToggle from '@/components/ui/PushToggle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

// Módulos gestionables (sin dashboard/configuracion: siempre visibles).
const MODULOS_GESTIONABLES = MODULOS.filter(m => m.slug !== 'dashboard' && m.slug !== 'configuracion')

const COLORES = [
  'bg-[#1a2e3b] text-white', 'bg-[#40b5fa] text-white', 'bg-emerald-600 text-white',
  'bg-purple-600 text-white', 'bg-orange-500 text-white', 'bg-rose-600 text-white',
  'bg-cyan-600 text-white', 'bg-slate-600 text-white',
]

// Traduce las clases Tailwind del color guardado a un fondo para el badge inline.
function badgeStyle(color: string): React.CSSProperties {
  const map: Record<string, string> = {
    'bg-[#1a2e3b]': '#1a2e3b', 'bg-[#40b5fa]': '#40b5fa', 'bg-emerald-600': '#059669',
    'bg-purple-600': '#9333ea', 'bg-orange-500': '#f97316', 'bg-rose-600': '#e11d48',
    'bg-cyan-600': '#0891b2', 'bg-slate-600': '#475569',
  }
  const key = Object.keys(map).find(k => color.includes(k))
  return { background: key ? map[key] : '#475569', color: '#fff' }
}

async function authFetch(url: string, init?: RequestInit) {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error ?? 'Error')
  return json
}

export default function ConfiguracionPage() {
  const [me,       setMe]       = useState<Row | null>(null)
  const [usuarios, setUsuarios] = useState<Row[]>([])
  const [roles,    setRoles]    = useState<RolApp[]>([])
  const [apagados, setApagados] = useState<string[]>([])
  const [loading,  setLoading]  = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingMod,setSavingMod]= useState<string | null>(null)
  const [err,      setErr]      = useState<string | null>(null)

  // Mi perfil
  const [editMode,   setEditMode]   = useState(false)
  const [editForm,   setEditForm]   = useState({ document_id: '', phone: '', bio: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved,  setEditSaved]  = useState(false)

  // Crear usuario
  const [nuevo,      setNuevo]      = useState({ full_name: '', email: '', password: '', role: 'consultant' })
  const [creando,    setCreando]    = useState(false)
  const [creado,     setCreado]     = useState(false)

  // Crear rol
  const [nuevoRol,   setNuevoRol]   = useState({ nombre: '', color: COLORES[0] })
  const [creandoRol, setCreandoRol] = useState(false)
  const [savingRol,  setSavingRol]  = useState<string | null>(null)

  const isAdmin = me?.role === 'admin'

  const loadAdmin = useCallback(async () => {
    const [{ usuarios }, { roles }, { apagados }] = await Promise.all([
      authFetch('/api/admin/usuarios'),
      authFetch('/api/admin/roles'),
      authFetch('/api/admin/modulos'),
    ])
    setUsuarios(usuarios ?? [])
    setRoles(roles ?? [])
    setApagados(apagados ?? [])
  }, [])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mine } = await supabase.from('profiles').select('*').eq('id', user?.id ?? '').single()
    setMe(mine)
    setEditForm({ document_id: mine?.document_id ?? '', phone: mine?.phone ?? '', bio: mine?.bio ?? '' })
    if (mine?.role === 'admin') { try { await loadAdmin() } catch (e) { setErr((e as Error).message) } }
    setLoading(false)
  }, [loadAdmin])

  useEffect(() => { load() }, [load])

  async function saveMiPerfil() {
    if (!me) return
    setEditSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update(editForm).eq('id', me.id)
    setMe((p: Row) => ({ ...p, ...editForm }))
    setEditSaving(false); setEditMode(false)
    setEditSaved(true); setTimeout(() => setEditSaved(false), 2000)
  }

  // ── Usuarios ──
  async function crearUsuario() {
    setErr(null)
    if (!nuevo.full_name || !nuevo.email || !nuevo.password) { setErr('Completa nombre, email y contraseña.'); return }
    setCreando(true)
    try {
      await authFetch('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(nuevo) })
      setNuevo({ full_name: '', email: '', password: '', role: 'consultant' })
      setCreado(true); setTimeout(() => setCreado(false), 2500)
      await loadAdmin()
    } catch (e) { setErr((e as Error).message) } finally { setCreando(false) }
  }

  async function patchUsuario(id: string, patch: Record<string, unknown>) {
    setSavingId(id); setErr(null)
    try {
      await authFetch('/api/admin/usuarios', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) })
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
    } catch (e) { setErr((e as Error).message) } finally { setSavingId(null) }
  }

  // ── Roles ──
  async function crearRol() {
    if (!nuevoRol.nombre.trim()) return
    setCreandoRol(true); setErr(null)
    try {
      await authFetch('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ nombre: nuevoRol.nombre, color: nuevoRol.color, modulos: [] }),
      })
      setNuevoRol({ nombre: '', color: COLORES[0] })
      await loadAdmin()
    } catch (e) { setErr((e as Error).message) } finally { setCreandoRol(false) }
  }

  async function patchRol(slug: string, patch: Partial<RolApp>) {
    setSavingRol(slug); setErr(null)
    try {
      const { rol } = await authFetch('/api/admin/roles', { method: 'PATCH', body: JSON.stringify({ slug, ...patch }) })
      setRoles(prev => prev.map(r => r.slug === slug ? { ...r, ...rol } : r))
    } catch (e) { setErr((e as Error).message) } finally { setSavingRol(null) }
  }

  async function toggleModuloEnRol(rol: RolApp, slug: string) {
    // modulos = null → el rol usa defaults del código; al editar, materializamos esa lista.
    const base = rol.modulos ?? modulosDefaultDeRol(rol.slug)
    const next = base.includes(slug) ? base.filter(s => s !== slug) : [...base, slug]
    await patchRol(rol.slug, { modulos: next })
  }

  async function borrarRol(slug: string) {
    if (!confirm('¿Borrar este rol? Debe no tener usuarios asignados.')) return
    setSavingRol(slug); setErr(null)
    try {
      await authFetch(`/api/admin/roles?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' })
      setRoles(prev => prev.filter(r => r.slug !== slug))
    } catch (e) { setErr((e as Error).message) } finally { setSavingRol(null) }
  }

  // ── Módulos global ──
  async function toggleModuloGlobal(slug: string) {
    const activo = apagados.includes(slug) // si estaba apagado, lo prendemos
    setSavingMod(slug); setErr(null)
    try {
      await authFetch('/api/admin/modulos', { method: 'PATCH', body: JSON.stringify({ slug, activo }) })
      setApagados(prev => activo ? prev.filter(s => s !== slug) : [...prev, slug])
    } catch (e) { setErr((e as Error).message) } finally { setSavingMod(null) }
  }

  if (loading || !me) return <PageSkeleton />

  const miRol     = ROLE_LABELS[me.email] ?? (isAdmin ? 'Super admin' : 'Consultor')
  const iniciales = (me.full_name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const nombreRol = (slug: string) => roles.find(r => r.slug === slug)?.nombre ?? slug

  return (
    <div className="p-4 lg:p-8 max-w-3xl space-y-10">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Configuración</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>{isAdmin ? 'Sistema' : 'Mi cuenta'}</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>
          {isAdmin ? 'Usuarios, roles, módulos y permisos del equipo.' : 'Tus notificaciones y tus datos personales.'}
        </p>
      </div>

      {err && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(255,107,107,0.10)', color: '#e11d48', border: '1px solid rgba(255,107,107,0.25)' }}>{err}</div>
      )}

      {/* ── Notificaciones push ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4" style={{ color: '#40b5fa' }} />
          <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Notificaciones push</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>Recibe notificaciones en el celular aunque la app esté cerrada. Actívalas en cada dispositivo.</p>
        <div className="rounded-2xl px-5 py-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <PushToggle topics={isAdmin ? ['general', 'admin'] : ['general']} />
        </div>
      </section>

      {/* ── Mi perfil ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <UserCircle className="w-4 h-4" style={{ color: '#40b5fa' }} />
          <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Mi perfil</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>Completa tus datos. Tu nombre y tu rol los administra un super admin.</p>
        <div className="rounded-2xl px-5 py-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{iniciales}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{me.full_name}</p>
              <p className="text-[11px] truncate" style={{ color: '#6b8fa0' }}>{me.email} · {miRol}</p>
            </div>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)', cursor: 'pointer' }}>
                {editSaved ? <><Check className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />Guardado</> : <><Pencil className="w-3.5 h-3.5" />Editar</>}
              </button>
            )}
          </div>
          {editMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>Cédula</label>
                  <input value={editForm.document_id} onChange={e => setEditForm(p => ({ ...p, document_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>Teléfono</label>
                  <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>Bio</label>
                <textarea value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveMiPerfil} disabled={editSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#40b5fa', border: 'none', cursor: 'pointer' }}>
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Guardar
                </button>
                <button onClick={() => setEditMode(false)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {me.bio && <p className="text-sm w-full mb-1" style={{ color: '#4a5a6b' }}>{me.bio}</p>}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]" style={{ background: '#f4f7fa', color: me.document_id ? '#6b8fa0' : '#b6c4ce' }}><CreditCard className="w-3 h-3" />{me.document_id || 'Cédula sin registrar'}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]" style={{ background: '#f4f7fa', color: me.phone ? '#6b8fa0' : '#b6c4ce' }}><Phone className="w-3 h-3" />{me.phone || 'Teléfono sin registrar'}</span>
              {me.start_date && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]" style={{ background: '#f4f7fa', color: '#6b8fa0' }}><CalendarDays className="w-3 h-3" />Desde {new Date(me.start_date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── De aquí para abajo: solo super admins ── */}
      {isAdmin && (
        <>
          {/* ── Crear usuario ── */}
          <section>
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4" style={{ color: '#40b5fa' }} />
              <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Crear usuario</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>Da de alta a alguien del equipo con su rol. Entra con el email y la contraseña que definas.</p>
            <div className="rounded-2xl px-5 py-5 space-y-3" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>Nombre completo</label>
                  <input value={nuevo.full_name} onChange={e => setNuevo(p => ({ ...p, full_name: e.target.value }))} placeholder="Ej. Isabel Llano" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>Email</label>
                  <input value={nuevo.email} onChange={e => setNuevo(p => ({ ...p, email: e.target.value }))} placeholder="nombre@lcl.com" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>Contraseña</label>
                  <input value={nuevo.password} onChange={e => setNuevo(p => ({ ...p, password: e.target.value }))} placeholder="mínimo 6 caracteres" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>Rol</label>
                  <select value={nuevo.role} onChange={e => setNuevo(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm font-semibold outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                    {roles.map(r => <option key={r.slug} value={r.slug}>{r.nombre}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={crearUsuario} disabled={creando} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#40b5fa', border: 'none', cursor: 'pointer' }}>
                {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : creado ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {creado ? 'Usuario creado' : 'Crear usuario'}
              </button>
            </div>
          </section>

          {/* ── Módulos (global) ── */}
          <section>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="w-4 h-4" style={{ color: '#40b5fa' }} />
              <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Módulos del sistema</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>Apaga un módulo para ocultarlo de <b>todo el equipo</b> (incluidos admins). Los permisos por rol se controlan más abajo.</p>
            <div className="space-y-2">
              {MODULOS_GESTIONABLES.map(m => {
                const apagado = apagados.includes(m.slug)
                const saving  = savingMod === m.slug
                return (
                  <div key={m.slug} className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: apagado ? '#b6c4ce' : '#1a2e3b' }}>{m.label}</p>
                      <p className="text-[11px]" style={{ color: '#86a2b2' }}>{m.grupo}</p>
                    </div>
                    <button disabled={saving} onClick={() => toggleModuloGlobal(m.slug)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0" style={{ background: apagado ? 'rgba(255,107,107,0.10)' : 'rgba(74,222,128,0.10)', color: apagado ? '#ff6b6b' : '#059669', border: `1px solid ${apagado ? 'rgba(255,107,107,0.25)' : 'rgba(74,222,128,0.25)'}`, cursor: 'pointer' }}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}{apagado ? 'Apagado' : 'Activo'}
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
            <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>Cada rol ve los módulos marcados. <b>Super admin</b> ve todo siempre. Crea roles a la medida.</p>

            <div className="space-y-3">
              {roles.map(rol => {
                const esAdmin  = rol.slug === 'admin'
                const efectivos = rol.modulos ?? modulosDefaultDeRol(rol.slug)
                const saving   = savingRol === rol.slug
                return (
                  <div key={rol.slug} className="rounded-2xl px-5 py-4" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold" style={badgeStyle(rol.color)}>{rol.nombre}</span>
                      {rol.es_sistema && <span className="text-[10px] uppercase tracking-wider" style={{ color: '#b6c4ce' }}>Sistema</span>}
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#40b5fa' }} />}
                      <div className="flex-1" />
                      {!rol.es_sistema && (
                        <button onClick={() => borrarRol(rol.slug)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(255,107,107,0.08)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)', cursor: 'pointer' }}><Trash2 className="w-3 h-3" />Borrar</button>
                      )}
                    </div>
                    {esAdmin ? (
                      <p className="text-xs" style={{ color: '#86a2b2' }}>Acceso total. No se limita.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {MODULOS_GESTIONABLES.map(m => {
                          const on = efectivos.includes(m.slug)
                          return (
                            <button key={m.slug} disabled={saving} onClick={() => toggleModuloEnRol(rol, m.slug)} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all" style={{ background: on ? 'rgba(64,181,250,0.12)' : '#f4f7fa', color: on ? '#40b5fa' : '#b6c4ce', border: `1px solid ${on ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`, cursor: 'pointer' }}>
                              {on ? '✓ ' : ''}{m.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Crear rol */}
              <div className="rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: '#f9fbfd', border: '1px dashed rgba(0,40,80,0.15)' }}>
                <input value={nuevoRol.nombre} onChange={e => setNuevoRol(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del rol nuevo" className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
                <div className="flex items-center gap-1">
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setNuevoRol(p => ({ ...p, color: c }))} className="w-5 h-5 rounded-full" style={{ ...badgeStyle(c), outline: nuevoRol.color === c ? '2px solid #1a2e3b' : 'none', outlineOffset: 1, cursor: 'pointer', border: 'none' }} />
                  ))}
                </div>
                <button onClick={crearRol} disabled={creandoRol || !nuevoRol.nombre.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#40b5fa', border: 'none', cursor: 'pointer' }}>
                  {creandoRol ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Crear rol
                </button>
              </div>
            </div>
          </section>

          {/* ── Usuarios del equipo ── */}
          <section>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4" style={{ color: '#40b5fa' }} />
              <h2 className="text-base font-black" style={{ color: '#1a2e3b' }}>Usuarios del equipo</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: '#6b8fa0' }}>Cambia el rol, desactiva accesos o esconde las tareas de una persona a los consultores.</p>
            <div className="space-y-2">
              {usuarios.map(u => {
                const roleLabel = ROLE_LABELS[u.email] ?? nombreRol(u.role)
                const initials  = (u.full_name ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                const inactivo  = u.activo === false
                return (
                  <div key={u.id} className="rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)', opacity: inactivo ? 0.6 : 1 }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1a2e3b' }}>{u.full_name}</p>
                      <p className="text-[11px] truncate" style={{ color: '#6b8fa0' }}>{u.email} · {roleLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: '#86a2b2' }}>Rol</label>
                      <select value={u.role} disabled={savingId === u.id} onChange={e => patchUsuario(u.id, { role: e.target.value })} className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
                        {roles.map(r => <option key={r.slug} value={r.slug}>{r.nombre}</option>)}
                      </select>
                    </div>
                    <button disabled={savingId === u.id} onClick={() => patchUsuario(u.id, { oculta_tareas: !u.oculta_tareas })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: u.oculta_tareas ? 'rgba(255,107,107,0.10)' : '#f4f7fa', color: u.oculta_tareas ? '#ff6b6b' : '#6b8fa0', border: `1px solid ${u.oculta_tareas ? 'rgba(255,107,107,0.25)' : 'rgba(0,40,80,0.10)'}`, cursor: 'pointer' }}>
                      {u.oculta_tareas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{u.oculta_tareas ? 'Tareas ocultas' : 'Tareas visibles'}
                    </button>
                    <button disabled={savingId === u.id} onClick={() => patchUsuario(u.id, { activo: inactivo })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: inactivo ? '#f4f7fa' : 'rgba(74,222,128,0.10)', color: inactivo ? '#b6c4ce' : '#059669', border: `1px solid ${inactivo ? 'rgba(0,40,80,0.10)' : 'rgba(74,222,128,0.25)'}`, cursor: 'pointer' }}>
                      {savingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}{inactivo ? 'Inactivo' : 'Activo'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
