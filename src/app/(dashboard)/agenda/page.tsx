'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, formatDate } from '@/lib/utils'
import { RECURRENCE_CONFIG, RECURRENCE_OPTIONS, nextDueDate, type Recurrence } from '@/lib/tasks'
import { PageSkeleton } from '@/components/ui/Skeleton'
import {
  ClipboardCheck, Gauge, Plus, X, Loader2, Check, Circle,
  Trash2, RefreshCw, Building2, User, Clock, CheckCircle2,
} from 'lucide-react'

const AUDIT_SELECT = '*, companies(id, name), profiles(id, full_name)'
const IND_SELECT = '*, companies(id, name), profiles(id, full_name)'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

export default function AgendaPage() {
  const [tab, setTab] = useState<'auditorias' | 'indicadores'>('auditorias')
  const [audits, setAudits] = useState<Row[]>([])
  const [indicators, setIndicators] = useState<Row[]>([])
  const [profiles, setProfiles] = useState<Row[]>([])
  const [companies, setCompanies] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [a, i, p, c] = await Promise.all([
      supabase.from('audits').select(AUDIT_SELECT).order('audit_date', { ascending: true }),
      supabase.from('indicators').select(IND_SELECT).order('due_date', { ascending: true }),
      supabase.from('profiles').select('id, full_name').order('full_name'),
      supabase.from('companies').select('id, name').order('name'),
    ])
    setAudits(a.data ?? [])
    setIndicators(i.data ?? [])
    setProfiles(p.data ?? [])
    setCompanies(c.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 04</p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Agenda</h1>
        <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>Auditorías e indicadores del equipo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { id: 'auditorias',  icon: ClipboardCheck, label: `Auditorías (${audits.length})` },
          { id: 'indicadores', icon: Gauge,          label: `Indicadores (${indicators.length})` },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: tab === id ? 'rgba(64,181,250,0.12)' : '#f4f7fa',
              color: tab === id ? '#40b5fa' : '#6b8fa0',
              border: `1px solid ${tab === id ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'auditorias'
        ? <Auditorias audits={audits} profiles={profiles} companies={companies} reload={load} />
        : <Indicadores indicators={indicators} profiles={profiles} companies={companies} reload={load} />}
    </div>
  )
}

// ── AUDITORÍAS ────────────────────────────────────────────────────────────────
function Auditorias({ audits, profiles, companies, reload }: { audits: Row[]; profiles: Row[]; companies: Row[]; reload: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', company_id: '', responsable_id: '', audit_kind: 'interna', audit_date: '', notas: '' })
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!form.audit_date) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('audits').insert([{
      title: form.title || null,
      company_id: form.company_id || null,
      responsable_id: form.responsable_id || null,
      audit_kind: form.audit_kind,
      audit_date: form.audit_date,
      status: 'programada',
      notas: form.notas || null,
    }])
    setForm({ title: '', company_id: '', responsable_id: '', audit_kind: 'interna', audit_date: '', notas: '' })
    setShowNew(false); setSaving(false); reload()
  }

  async function toggle(a: Row) {
    const supabase = createClient()
    await supabase.from('audits').update({ status: a.status === 'hecha' ? 'programada' : 'hecha' }).eq('id', a.id)
    reload()
  }
  async function del(id: string) {
    const supabase = createClient()
    await supabase.from('audits').delete().eq('id', id)
    reload()
  }

  const programadas = audits.filter(a => a.status === 'programada').length
  const hechas = audits.filter(a => a.status === 'hecha').length

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat label="Programadas" value={programadas} color="#40b5fa" />
        <Stat label="Hechas" value={hechas} color="#4ade80" />
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#40b5fa', color: '#fff' }}>
          <Plus className="w-4 h-4" />Nueva auditoría
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: '#fff', border: '1px solid rgba(64,181,250,0.25)' }}>
          <Input label="Título / detalle" value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="Ej: Auditoría SARLAF" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Cliente" value={form.company_id} onChange={v => setForm(p => ({ ...p, company_id: v }))}>
              <option value="">Sin cliente</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Responsable" value={form.responsable_id} onChange={v => setForm(p => ({ ...p, responsable_id: v }))}>
              <option value="">Sin asignar</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
            <Select label="Tipo" value={form.audit_kind} onChange={v => setForm(p => ({ ...p, audit_kind: v }))}>
              <option value="interna">Interna</option>
              <option value="externa">Externa</option>
            </Select>
            <Input label="Fecha *" type="date" value={form.audit_date} onChange={v => setForm(p => ({ ...p, audit_date: v }))} />
          </div>
          <Input label="Notas" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} placeholder="Opcional" />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: '#e2e8f0', color: '#6b8fa0' }}>Cancelar</button>
            <button onClick={add} disabled={saving} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#40b5fa', color: '#fff' }}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {audits.length === 0 ? (
        <Empty icon={ClipboardCheck} text="Sin auditorías programadas" />
      ) : (
        <div className="space-y-2">
          {audits.map(a => {
            const done = a.status === 'hecha'
            const days = daysUntil(a.audit_date)
            const isVencida = days < 0 && !done
            return (
              <div key={a.id} className="rounded-2xl px-5 py-4 flex items-center gap-4"
                style={{ background: done ? 'rgba(74,222,128,0.04)' : isVencida ? 'rgba(255,107,107,0.04)' : '#fff', border: `1px solid ${done ? 'rgba(74,222,128,0.15)' : isVencida ? 'rgba(255,107,107,0.18)' : 'rgba(0,40,80,0.08)'}`, opacity: done ? 0.7 : 1 }}>
                <button onClick={() => toggle(a)} className="flex-shrink-0" title={done ? 'Marcar programada' : 'Marcar hecha'}>
                  {done ? <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} /> : <Circle className="w-5 h-5" style={{ color: '#86a2b2' }} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b', textDecoration: done ? 'line-through' : 'none' }}>
                    {a.title || `Auditoría ${a.audit_kind}`}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                      style={{ background: a.audit_kind === 'externa' ? 'rgba(251,146,60,0.12)' : 'rgba(64,181,250,0.10)', color: a.audit_kind === 'externa' ? '#fb923c' : '#40b5fa' }}>
                      {a.audit_kind}
                    </span>
                    {a.companies?.name && <span className="text-[11px] flex items-center gap-1" style={{ color: '#6b8fa0' }}><Building2 className="w-3 h-3" />{a.companies.name}</span>}
                    {a.profiles?.full_name && <span className="text-[11px] flex items-center gap-1" style={{ color: '#86a2b2' }}><User className="w-3 h-3" />{a.profiles.full_name}</span>}
                  </div>
                  {a.notas && <p className="text-[11px] mt-1" style={{ color: '#86a2b2' }}>{a.notas}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: done ? '#4ade80' : isVencida ? '#ff6b6b' : '#1a2e3b' }}>
                      {done ? '✓ Hecha' : days === 0 ? 'HOY' : isVencida ? `${Math.abs(days)}d` : days === 1 ? 'Mañana' : `${days}d`}
                    </p>
                    <p className="text-xs" style={{ color: '#6b8fa0' }}>{formatDate(a.audit_date)}</p>
                  </div>
                  <button onClick={() => del(a.id)} className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#ff6b6b' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── INDICADORES (por responsable) ─────────────────────────────────────────────
function Indicadores({ indicators, profiles, companies, reload }: { indicators: Row[]; profiles: Row[]; companies: Row[]; reload: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', responsable_id: '', company_id: '', frequency: 'mensual', due_date: '', notas: '' })
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!form.title.trim() || !form.due_date) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('indicators').insert([{
      title: form.title,
      responsable_id: form.responsable_id || null,
      company_id: form.company_id || null,
      frequency: form.frequency,
      due_date: form.due_date,
      status: 'pendiente',
      notas: form.notas || null,
    }])
    setForm({ title: '', responsable_id: '', company_id: '', frequency: 'mensual', due_date: '', notas: '' })
    setShowNew(false); setSaving(false); reload()
  }

  async function toggle(ind: Row) {
    const supabase = createClient()
    const entregado = ind.status === 'entregado'
    await supabase.from('indicators').update({ status: entregado ? 'pendiente' : 'entregado' }).eq('id', ind.id)
    // Al entregar uno con frecuencia, genera la siguiente entrega.
    if (!entregado && ind.frequency) {
      await supabase.from('indicators').insert([{
        title: ind.title,
        responsable_id: ind.responsable_id ?? null,
        company_id: ind.company_id ?? null,
        frequency: ind.frequency,
        due_date: nextDueDate(ind.due_date, ind.frequency as Recurrence),
        status: 'pendiente',
        notas: ind.notas ?? null,
      }])
    }
    reload()
  }
  async function del(id: string) {
    const supabase = createClient()
    await supabase.from('indicators').delete().eq('id', id)
    reload()
  }

  // Agrupar por responsable.
  const sinAsignar = indicators.filter(i => !i.responsable_id)
  const grupos = profiles
    .map(p => ({ persona: p, items: indicators.filter(i => i.responsable_id === p.id) }))
    .filter(g => g.items.length > 0)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#40b5fa', color: '#fff' }}>
          <Plus className="w-4 h-4" />Nuevo indicador
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: '#fff', border: '1px solid rgba(64,181,250,0.25)' }}>
          <Input label="Indicador *" value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="Ej: Reporte mensual de riesgos" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Responsable" value={form.responsable_id} onChange={v => setForm(p => ({ ...p, responsable_id: v }))}>
              <option value="">Sin asignar</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
            <Select label="Cliente" value={form.company_id} onChange={v => setForm(p => ({ ...p, company_id: v }))}>
              <option value="">Sin cliente</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Frecuencia" value={form.frequency} onChange={v => setForm(p => ({ ...p, frequency: v }))}>
              {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{RECURRENCE_CONFIG[r].label}</option>)}
            </Select>
            <Input label="Próxima entrega *" type="date" value={form.due_date} onChange={v => setForm(p => ({ ...p, due_date: v }))} />
          </div>
          <Input label="Notas" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} placeholder="Opcional" />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: '#e2e8f0', color: '#6b8fa0' }}>Cancelar</button>
            <button onClick={add} disabled={saving} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#40b5fa', color: '#fff' }}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {indicators.length === 0 ? (
        <Empty icon={Gauge} text="Sin indicadores registrados" />
      ) : (
        <div className="space-y-6">
          {grupos.map(({ persona, items }) => (
            <IndicadorGrupo key={persona.id} nombre={persona.full_name} items={items} onToggle={toggle} onDelete={del} />
          ))}
          {sinAsignar.length > 0 && (
            <IndicadorGrupo nombre="Sin asignar" items={sinAsignar} onToggle={toggle} onDelete={del} />
          )}
        </div>
      )}
    </div>
  )
}

function IndicadorGrupo({ nombre, items, onToggle, onDelete }: { nombre: string; items: Row[]; onToggle: (i: Row) => void; onDelete: (id: string) => void }) {
  const initials = nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const pend = items.filter(i => i.status !== 'entregado').length
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{initials}</div>
        <h3 className="text-sm font-bold" style={{ color: '#1a2e3b' }}>{nombre}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>{pend} pendiente{pend !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {items.map(ind => {
          const done = ind.status === 'entregado'
          const days = daysUntil(ind.due_date)
          const isVencida = days < 0 && !done
          return (
            <div key={ind.id} className="rounded-2xl px-5 py-3.5 flex items-center gap-4"
              style={{ background: done ? 'rgba(74,222,128,0.04)' : isVencida ? 'rgba(255,107,107,0.04)' : '#fff', border: `1px solid ${done ? 'rgba(74,222,128,0.15)' : isVencida ? 'rgba(255,107,107,0.18)' : 'rgba(0,40,80,0.08)'}`, opacity: done ? 0.7 : 1 }}>
              <button onClick={() => onToggle(ind)} className="flex-shrink-0" title={done ? 'Marcar pendiente' : 'Marcar entregado'}>
                {done ? <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} /> : <Circle className="w-5 h-5" style={{ color: '#86a2b2' }} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b', textDecoration: done ? 'line-through' : 'none' }}>{ind.title}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {ind.frequency && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(52,211,153,0.10)', color: '#059669' }}>
                      <RefreshCw className="w-2.5 h-2.5" />{RECURRENCE_CONFIG[ind.frequency as Recurrence]?.short ?? ind.frequency}
                    </span>
                  )}
                  {ind.companies?.name && <span className="text-[11px]" style={{ color: '#6b8fa0' }}>{ind.companies.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs" style={{ color: done ? '#4ade80' : isVencida ? '#ff6b6b' : '#86a2b2' }}>
                  {done ? <span>✓ Entregado</span> : <><Clock className="w-3 h-3" />{days === 0 ? 'Hoy' : isVencida ? `${Math.abs(days)}d` : days === 1 ? 'Mañana' : formatDate(ind.due_date)}</>}
                </div>
                <button onClick={() => onDelete(ind.id)} className="p-1 rounded-lg opacity-30 hover:opacity-100 transition-opacity" style={{ color: '#ff6b6b' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl px-3 py-3 text-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#6b8fa0' }}>{label}</div>
    </div>
  )
}

function Empty({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center py-20" style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
      <Icon className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
      <p className="font-semibold" style={{ color: '#6b8fa0' }}>{text}</p>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
    </div>
  )
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: '#6b8fa0' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }}>
        {children}
      </select>
    </div>
  )
}
