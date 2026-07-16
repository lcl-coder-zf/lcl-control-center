'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Lock, Unlock, Eye, EyeOff, Plus, Pencil, Trash2, Copy, Check, X,
  KeyRound, Mail, ShieldCheck, Building2, Landmark, Code2, Share2, HelpCircle, Search, Globe,
} from 'lucide-react'

const VAULT_PIN = '1112'

type Categoria = 'correos' | 'cumplimiento' | 'gobierno' | 'bancos' | 'software' | 'redes_sociales' | 'otro'

const CAT: Record<Categoria, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  correos:        { label: 'Correos',        color: '#7c3aed', bg: '#f5f3ff', Icon: Mail },
  cumplimiento:   { label: 'Cumplimiento',   color: '#0369a1', bg: '#eff6ff', Icon: ShieldCheck },
  gobierno:       { label: 'Gobierno',       color: '#b45309', bg: '#fffbeb', Icon: Building2 },
  bancos:         { label: 'Bancos',         color: '#15803d', bg: '#f0fdf4', Icon: Landmark },
  software:       { label: 'Software',       color: '#0891b2', bg: '#ecfeff', Icon: Code2 },
  redes_sociales: { label: 'Redes sociales', color: '#db2777', bg: '#fdf2f8', Icon: Share2 },
  otro:           { label: 'Otro',           color: '#6b7a9e', bg: '#f4f6fb', Icon: HelpCircle },
}
const CAT_KEYS = Object.keys(CAT) as Categoria[]

interface VaultItem {
  id: string
  nombre: string
  usuario: string | null
  contrasena: string | null
  url: string | null
  notas: string | null
  categoria: Categoria
}

type FormData = { nombre: string; usuario: string; contrasena: string; url: string; notas: string; categoria: Categoria }
const FORM_VACIO: FormData = { nombre: '', usuario: '', contrasena: '', url: '', notas: '', categoria: 'otro' }

// ── PIN Keypad ──────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  const handleKey = useCallback((d: string) => {
    setPin(prev => {
      if (prev.length >= 4) return prev
      const next = prev + d
      if (next.length === 4) {
        if (next === VAULT_PIN) setTimeout(onUnlock, 150)
        else { setShake(true); setTimeout(() => { setPin(''); setShake(false) }, 600) }
      }
      return next
    })
  }, [onUnlock])

  const handleDel = useCallback(() => setPin(p => p.slice(0, -1)), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); handleKey(e.key) }
      else if (e.key === 'Backspace') { e.preventDefault(); handleDel() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey, handleDel])

  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-xs mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#1a2e3b' }}>
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#1a2e3b' }}>Vault de contraseñas</h1>
          <p className="text-xs mt-1" style={{ color: '#6b8fa0' }}>Ingresa tu PIN para acceder</p>
        </div>
        <div className={`flex justify-center gap-4 mb-8 ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-3 h-3 rounded-full border-2 transition-all duration-150"
              style={{
                background: i < pin.length ? '#40b5fa' : 'transparent',
                borderColor: i < pin.length ? '#40b5fa' : '#c8d3ea',
                transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
              }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => {
            if (k === '') return <div key={i} />
            const isDel = k === '⌫'
            return (
              <button key={i} onClick={() => isDel ? handleDel() : handleKey(k)}
                className="h-14 rounded-2xl text-lg font-semibold transition-all duration-100 active:scale-95"
                style={{ background: isDel ? '#f4f7fa' : '#fff', color: isDel ? '#9aaac8' : '#1a2e3b', border: '1px solid #e2e8f5', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {k}
              </button>
            )
          })}
        </div>
      </div>
      <style jsx>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
      `}</style>
    </div>
  )
}

// ── Tarjeta credencial ───────────────────────────────────────────────────────
function CredCard({ item, onEdit, onDelete }: { item: VaultItem; onEdit: (i: VaultItem) => void; onDelete: (id: string) => void }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState<'user' | 'pass' | null>(null)
  const cfg = CAT[item.categoria] ?? CAT.otro
  const Icon = cfg.Icon

  async function copy(type: 'user' | 'pass') {
    await navigator.clipboard.writeText((type === 'user' ? item.usuario : item.contrasena) ?? '')
    setCopied(type); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="bg-white rounded-2xl border p-5 transition-all" style={{ borderColor: 'rgba(0,40,80,0.08)' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
          <Icon size={16} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: '#1a2e3b' }}>{item.nombre}</div>
          <div className="text-[10px] px-1.5 py-0.5 rounded-md inline-block mt-0.5" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa] hover:text-[#40b5fa]"><Pencil size={12} /></button>
          <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
        </div>
      </div>

      {item.usuario && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-[1.5px] mb-1" style={{ color: '#9aaac8' }}>Usuario / Correo</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-xs font-mono bg-[#f4f7fa] rounded-lg px-3 py-1.5 truncate" style={{ color: '#4a5a82' }}>{item.usuario}</div>
            <button onClick={() => copy('user')} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa] hover:text-[#40b5fa] flex-shrink-0">
              {copied === 'user' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {item.contrasena && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-[1.5px] mb-1" style={{ color: '#9aaac8' }}>Contraseña</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-xs font-mono bg-[#f4f7fa] rounded-lg px-3 py-1.5 truncate" style={{ color: '#4a5a82' }}>
              {show ? item.contrasena : '••••••••••'}
            </div>
            <button onClick={() => setShow(s => !s)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa] hover:text-[#40b5fa] flex-shrink-0">
              {show ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={() => copy('pass')} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa] hover:text-[#40b5fa] flex-shrink-0">
              {copied === 'pass' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {item.url && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#f0f3fa' }}>
          <Globe size={11} className="text-[#9aaac8] flex-shrink-0" />
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline truncate" style={{ color: '#40b5fa' }}>{item.url}</a>
        </div>
      )}
      {item.notas && (
        <div className="mt-3 pt-3 border-t text-xs leading-relaxed" style={{ borderColor: '#f0f3fa', color: '#6b7a9e' }}>{item.notas}</div>
      )}
    </div>
  )
}

// ── Modal add/edit ────────────────────────────────────────────────────────────
function Modal({ form, onChange, onSave, onClose, saving, editing }: {
  form: FormData; onChange: (f: FormData) => void; onSave: () => void; onClose: () => void; saving: boolean; editing: boolean
}) {
  const [showPass, setShowPass] = useState(false)
  const inp = 'w-full px-3 py-2 rounded-xl border text-sm bg-white focus:outline-none font-mono'
  const inpStyle = { borderColor: '#e2e8f5', color: '#1a2e3b' }
  const lbl = 'block text-xs font-medium mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white" style={{ borderColor: '#e2e8f5' }}>
          <h2 className="font-bold text-sm" style={{ color: '#1a2e3b' }}>{editing ? 'Editar credencial' : 'Nueva credencial'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa]"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={lbl} style={{ color: '#6b7a9e' }}>Nombre *</label>
            <input value={form.nombre} onChange={e => onChange({ ...form, nombre: e.target.value })} placeholder="Ej: Correo Cumplimiento" className={inp} style={inpStyle} />
          </div>
          <div>
            <label className={lbl} style={{ color: '#6b7a9e' }}>Usuario / Correo</label>
            <input value={form.usuario} onChange={e => onChange({ ...form, usuario: e.target.value })} placeholder="usuario@ejemplo.com" className={inp} style={inpStyle} />
          </div>
          <div>
            <label className={lbl} style={{ color: '#6b7a9e' }}>Contraseña</label>
            <input type={showPass ? 'text' : 'password'} value={form.contrasena} onChange={e => onChange({ ...form, contrasena: e.target.value })} placeholder="••••••••" className={inp} style={inpStyle} />
            <button type="button" onClick={() => setShowPass(s => !s)} className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#9aaac8' }}>
              {showPass ? <><EyeOff size={10} /> Ocultar</> : <><Eye size={10} /> Mostrar</>}
            </button>
          </div>
          <div>
            <label className={lbl} style={{ color: '#6b7a9e' }}>Categoría</label>
            <select value={form.categoria} onChange={e => onChange({ ...form, categoria: e.target.value as Categoria })} className="w-full px-3 py-2 rounded-xl border text-sm bg-white focus:outline-none" style={inpStyle}>
              {CAT_KEYS.map(k => <option key={k} value={k}>{CAT[k].label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl} style={{ color: '#6b7a9e' }}>URL (opcional)</label>
            <input value={form.url} onChange={e => onChange({ ...form, url: e.target.value })} placeholder="https://…" className={inp} style={inpStyle} />
          </div>
          <div>
            <label className={lbl} style={{ color: '#6b7a9e' }}>Notas</label>
            <textarea value={form.notas} onChange={e => onChange({ ...form, notas: e.target.value })} rows={2} placeholder="Notas adicionales…" className="w-full px-3 py-2 rounded-xl border text-sm bg-white focus:outline-none resize-none" style={inpStyle} />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm" style={{ borderColor: '#e2e8f5', color: '#6b7a9e' }}>Cancelar</button>
          <button onClick={onSave} disabled={saving || !form.nombre} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#40b5fa' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function VaultPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [items, setItems] = useState<VaultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VACIO)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<Categoria | 'all'>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!unlocked) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('vault_items').select('*').order('categoria').order('nombre')
    if (error) setError(error.message)
    else setItems((data as VaultItem[]) ?? [])
    setLoading(false)
  }, [unlocked])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditingId(null); setForm(FORM_VACIO); setShowModal(true) }
  function openEdit(item: VaultItem) {
    setEditingId(item.id)
    setForm({ nombre: item.nombre, usuario: item.usuario ?? '', contrasena: item.contrasena ?? '', url: item.url ?? '', notas: item.notas ?? '', categoria: item.categoria })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nombre) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      nombre: form.nombre, usuario: form.usuario || null, contrasena: form.contrasena || null,
      url: form.url || null, notas: form.notas || null, categoria: form.categoria,
    }
    if (editingId) await supabase.from('vault_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
    else await supabase.from('vault_items').insert([payload])
    setShowModal(false)
    setSaving(false)
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta credencial?')) return
    const supabase = createClient()
    await supabase.from('vault_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (!unlocked) return <div className="p-4 lg:p-8"><PinScreen onUnlock={() => setUnlocked(true)} /></div>

  const q = search.trim().toLowerCase()
  const filtered = items.filter(i => {
    if (filterCat !== 'all' && i.categoria !== filterCat) return false
    if (q) {
      const hay = [i.nombre, i.usuario ?? '', i.notas ?? '', i.url ?? '', CAT[i.categoria]?.label ?? ''].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1a2e3b' }}>
            <Unlock size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#1a2e3b' }}>Vault de contraseñas</h1>
            <p className="text-xs" style={{ color: '#6b8fa0' }}>{items.length} credencial{items.length !== 1 ? 'es' : ''} · solo Laura y Daniel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setUnlocked(false); setItems([]) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs" style={{ borderColor: '#e2e8f5', color: '#9aaac8' }}>
            <Lock size={12} /> Bloquear
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#40b5fa' }}>
            <Plus size={13} /> Nueva
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aaac8] pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, usuario o nota…"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border text-sm bg-white focus:outline-none" style={{ borderColor: '#e2e8f5', color: '#1a2e3b' }} />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-[#9aaac8] hover:bg-[#f4f7fa]"><X size={13} /></button>
        )}
      </div>

      {/* Filtro categorías */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button onClick={() => setFilterCat('all')}
          className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all"
          style={filterCat === 'all' ? { background: '#1a2e3b', color: '#fff', borderColor: '#1a2e3b' } : { background: '#fff', color: '#6b7a9e', borderColor: '#e2e8f5' }}>
          Todas
        </button>
        {CAT_KEYS.map(k => (
          <button key={k} onClick={() => setFilterCat(k)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all"
            style={filterCat === k ? { background: CAT[k].color, color: '#fff', borderColor: 'transparent' } : { background: '#fff', color: '#6b7a9e', borderColor: '#e2e8f5' }}>
            {CAT[k].label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600 mb-4 flex justify-between items-center">
          {error}<button onClick={() => setError('')}><X size={12} /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: '#9aaac8' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <KeyRound size={32} className="mx-auto mb-3" style={{ color: '#c8d3ea' }} />
          <p className="text-sm" style={{ color: '#9aaac8' }}>
            {items.length === 0 ? 'No hay credenciales guardadas todavía.' : q ? `Sin resultados para "${search}".` : 'Sin resultados en esta categoría.'}
          </p>
          {items.length === 0 && (
            <button onClick={openAdd} className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#40b5fa' }}>+ Agregar primera credencial</button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => <CredCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />)}
        </div>
      )}

      {showModal && (
        <Modal form={form} onChange={setForm} onSave={handleSave} onClose={() => setShowModal(false)} saving={saving} editing={!!editingId} />
      )}
    </div>
  )
}
