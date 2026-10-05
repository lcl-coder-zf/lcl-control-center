'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { completitud } from '@/lib/perfil'
import { Loader2, Check, Lock, Plus, X } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const SUGERIDAS = ['SST', 'BASC', 'ISO 9001', 'ISO 14001', 'ISO 45001', 'Contable', 'Tributario', 'Nómina', 'Jurídico', 'Talento humano', 'Auditoría', 'Tecnología']

const inputStyle: React.CSSProperties = { background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#86a2b2' }}>{label}</label>
      {children}
    </div>
  )
}

/**
 * Formulario del perfil de una persona. Lo usa cada quien en "Mi cuenta" y los
 * admin desde el panel de Equipo. Lo público va a `profiles`; cédula, dirección y
 * contacto de emergencia van a `profile_private` (solo dueño + admin).
 * La fecha de ingreso solo es editable con `canEditStartDate` (admin / Laura).
 */
export default function PerfilForm({ profile, canEditStartDate, onSaved, onCancel, cancelLabel = 'Cancelar' }: {
  profile: Row
  canEditStartDate: boolean
  onSaved: (updated: Row, priv: Row) => void
  onCancel?: () => void
  cancelLabel?: string
}) {
  const [form, setForm] = useState({
    phone:          profile.phone ?? '',
    bio:            profile.bio ?? '',
    profesion:      profile.profesion ?? '',
    birth_day:      profile.birth_day ? String(profile.birth_day) : '',
    birth_month:    profile.birth_month ? String(profile.birth_month) : '',
    especialidades: (profile.especialidades ?? []) as string[],
    start_date:     profile.start_date ?? '',
  })
  const [priv, setPriv] = useState({ cedula: '', direccion: '', emergencia_nombre: '', emergencia_telefono: '' })
  const [nuevaEsp, setNuevaEsp] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('profile_private').select('*').eq('profile_id', profile.id).maybeSingle()
      .then(({ data }) => {
        setPriv({
          cedula:              data?.cedula ?? profile.document_id ?? '',
          direccion:           data?.direccion ?? '',
          emergencia_nombre:   data?.emergencia_nombre ?? '',
          emergencia_telefono: data?.emergencia_telefono ?? '',
        })
      })
  }, [profile.id, profile.document_id])

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const toggleEsp = (e: string) => set('especialidades',
    form.especialidades.includes(e) ? form.especialidades.filter(x => x !== e) : [...form.especialidades, e])
  const agregarEsp = () => {
    const v = nuevaEsp.trim()
    if (v && !form.especialidades.includes(v)) set('especialidades', [...form.especialidades, v])
    setNuevaEsp('')
  }

  const publico = {
    phone:          form.phone.trim() || null,
    bio:            form.bio.trim() || null,
    profesion:      form.profesion.trim() || null,
    birth_day:      form.birth_day ? Number(form.birth_day) : null,
    birth_month:    form.birth_month ? Number(form.birth_month) : null,
    especialidades: form.especialidades,
    ...(canEditStartDate ? { start_date: form.start_date || null } : {}),
  }
  const pct = completitud({ ...profile, ...publico }, priv)

  async function save() {
    setSaving(true); setErr(null)
    const sb = createClient()
    const [a, b] = await Promise.all([
      sb.from('profiles').update(publico).eq('id', profile.id),
      sb.from('profile_private').upsert({ profile_id: profile.id, ...priv, updated_at: new Date().toISOString() }),
    ])
    setSaving(false)
    const e = a.error ?? b.error
    if (e) { setErr(e.message); return }
    onSaved({ ...profile, ...publico }, priv)
  }

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold" style={{ color: '#6b8fa0' }}>Perfil completo</span>
          <span className="text-[11px] font-bold" style={{ color: pct === 100 ? '#4ade80' : '#40b5fa' }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,40,80,0.07)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#4ade80' : '#40b5fa' }} />
        </div>
      </div>

      {/* Visible para el equipo */}
      <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#40b5fa' }}>Lo ve todo el equipo</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Teléfono">
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="3001234567"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Profesión / estudios">
          <input value={form.profesion} onChange={e => set('profesion', e.target.value)} placeholder="Ej: Ingeniera industrial"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Cumpleaños">
          <div className="flex gap-2">
            <select value={form.birth_day} onChange={e => set('birth_day', e.target.value)}
              className="w-20 px-2 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
              <option value="">Día</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <select value={form.birth_month} onChange={e => set('birth_month', e.target.value)}
              className="flex-1 px-2 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
              <option value="">Mes</option>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Fecha de ingreso">
          {canEditStartDate
            ? <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
            : <div className="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-1.5" style={{ ...inputStyle, color: '#86a2b2' }}>
                <Lock className="w-3 h-3" />
                {form.start_date
                  ? new Date(form.start_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'La registra Laura'}
              </div>}
        </Field>
      </div>
      <Field label="Descripción breve">
        <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={2}
          placeholder="Ej: Experta en auditorías ISO y BASC."
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
      </Field>
      <Field label="Especialidades">
        <div className="flex flex-wrap gap-1.5">
          {[...SUGERIDAS, ...form.especialidades.filter(e => !SUGERIDAS.includes(e))].map(e => {
            const on = form.especialidades.includes(e)
            return (
              <button key={e} type="button" onClick={() => toggleEsp(e)}
                className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1"
                style={on
                  ? { background: 'rgba(64,181,250,0.14)', color: '#2a9ae0', border: '1px solid rgba(64,181,250,0.4)' }
                  : { background: '#f4f7fa', color: '#86a2b2', border: '1px solid rgba(0,40,80,0.08)' }}>
                {on && <Check className="w-3 h-3" />}{e}
                {on && !SUGERIDAS.includes(e) && <X className="w-3 h-3 opacity-60" />}
              </button>
            )
          })}
          <div className="flex items-center gap-1 rounded-lg px-2" style={inputStyle}>
            <input value={nuevaEsp} onChange={e => setNuevaEsp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarEsp() } }}
              placeholder="Otra…" className="w-20 text-xs py-1 bg-transparent outline-none" />
            <button type="button" onClick={agregarEsp} style={{ color: '#40b5fa' }}><Plus className="w-3 h-3" /></button>
          </div>
        </div>
      </Field>

      {/* Privado */}
      <p className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 pt-1" style={{ color: '#a78bfa' }}>
        <Lock className="w-3 h-3" /> Privado · solo tú y los administradores
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Cédula">
          <input value={priv.cedula} onChange={e => setPriv(p => ({ ...p, cedula: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Dirección">
          <input value={priv.direccion} onChange={e => setPriv(p => ({ ...p, direccion: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Contacto de emergencia">
          <input value={priv.emergencia_nombre} onChange={e => setPriv(p => ({ ...p, emergencia_nombre: e.target.value }))}
            placeholder="Nombre y parentesco"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Teléfono de emergencia">
          <input value={priv.emergencia_telefono} onChange={e => setPriv(p => ({ ...p, emergencia_telefono: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </Field>
      </div>

      {err && <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(255,107,107,0.10)', color: '#e11d48' }}>No se pudo guardar: {err}</p>}

      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#40b5fa' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Guardar
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>{cancelLabel}</button>
        )}
      </div>
    </div>
  )
}
