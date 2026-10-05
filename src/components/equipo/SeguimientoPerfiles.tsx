'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { completitud } from '@/lib/perfil'
import { notify } from '@/lib/notify'
import { pushNotify } from '@/lib/push-client'
import { ClipboardCheck, Send, Loader2, ChevronDown, Check } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

const fecha = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

/**
 * Seguimiento (solo admin) del aviso "Completa tu perfil": quién lo completó,
 * quién lo vio y no lo llenó, quién no ha entrado. "Reenviar" vuelve a mostrar
 * la ventana en su próxima entrada + noti en la campana y push al celular.
 */
export default function SeguimientoPerfiles({ profiles, onUpdated }: {
  profiles: Row[]
  onUpdated: (id: string, patch: Row) => void
}) {
  const [privs,   setPrivs]   = useState<Record<string, Row>>({})
  const [open,    setOpen]    = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('profile_private').select('*').then(({ data }) => {
      setPrivs(Object.fromEntries((data ?? []).map(r => [r.profile_id, r])))
    })
  }, [])

  // Sin la migración del aviso no hay nada que seguir
  if (profiles.length === 0 || !('perfil_aviso_visto_at' in profiles[0])) return null

  const filas = profiles.map(p => {
    const pct = completitud(p, privs[p.id] ?? {})
    const reenviadoPendiente = !!p.perfil_aviso_enviado_at &&
      (!p.perfil_aviso_visto_at || new Date(p.perfil_aviso_enviado_at) > new Date(p.perfil_aviso_visto_at))
    const estado =
      pct === 100               ? { txt: 'Completo', color: '#16a34a' } :
      reenviadoPendiente        ? { txt: `Reenviado ${fecha(p.perfil_aviso_enviado_at)} · aún no entra`, color: '#a78bfa' } :
      p.perfil_aviso_visto_at   ? { txt: `Lo vio ${fecha(p.perfil_aviso_visto_at)} · sin completar`, color: '#f59e0b' } :
                                  { txt: 'No ha entrado desde el aviso', color: '#86a2b2' }
    return { p, pct, estado }
  }).sort((a, b) => a.pct - b.pct)

  const completos   = filas.filter(f => f.pct === 100).length
  const incompletos = filas.filter(f => f.pct < 100)

  async function reenviar(ids: string[]) {
    if (ids.length === 0) return
    setSending(ids.length > 1 ? 'todos' : ids[0])
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const ahora = new Date().toISOString()
    await Promise.all(ids.map(id => {
      const envios = (profiles.find(p => p.id === id)?.perfil_aviso_envios ?? 0) + 1
      onUpdated(id, { perfil_aviso_enviado_at: ahora, perfil_aviso_envios: envios })
      return sb.from('profiles').update({ perfil_aviso_enviado_at: ahora, perfil_aviso_envios: envios }).eq('id', id)
    }))
    const message = 'Te falta completar tu perfil del equipo. Toma 2 minutos 🙏'
    await notify(sb, { recipientIds: ids, type: 'perfil', message, link: '/configuracion', actorId: user?.id })
    await pushNotify(sb, { title: 'Completa tu perfil', body: message, url: '/configuracion', recipientIds: ids, tag: 'perfil' })
    setSending(null)
  }

  return (
    <div className="rounded-2xl mb-5" style={{ background: '#fff', border: '1px solid rgba(0,40,80,0.08)' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full px-4 py-3 flex items-center gap-2 text-left">
        <ClipboardCheck className="w-4 h-4" style={{ color: '#40b5fa' }} />
        <span className="text-sm font-bold" style={{ color: '#1a2e3b' }}>Perfiles del equipo</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: completos === filas.length ? 'rgba(74,222,128,0.15)' : 'rgba(64,181,250,0.12)', color: completos === filas.length ? '#16a34a' : '#40b5fa' }}>
          {completos}/{filas.length} completos
        </span>
        <span className="text-[10px] ml-1" style={{ color: '#b0bcc7' }}>solo admin</span>
        <ChevronDown className="w-4 h-4 ml-auto transition-transform" style={{ color: '#86a2b2', transform: open ? 'rotate(0)' : 'rotate(-90deg)' }} />
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(0,40,80,0.06)' }}>
          <div className="space-y-1.5 mt-3">
            {filas.map(({ p, pct, estado }) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: '#f8fafc' }}>
                <div className="w-28 sm:w-40 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: '#1a2e3b' }}>{p.full_name}</p>
                  <p className="text-[10px] truncate" style={{ color: estado.color }}>{estado.txt}</p>
                </div>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,40,80,0.07)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#4ade80' : '#40b5fa' }} />
                </div>
                <span className="text-[11px] font-bold w-9 text-right" style={{ color: pct === 100 ? '#16a34a' : '#40b5fa' }}>{pct}%</span>
                <div className="w-24 flex justify-end">
                  {pct === 100
                    ? <Check className="w-4 h-4" style={{ color: '#4ade80' }} />
                    : <button onClick={() => reenviar([p.id])} disabled={!!sending}
                        title={p.perfil_aviso_envios ? `Reenviado ${p.perfil_aviso_envios} vez/veces` : 'Volver a mostrarle el aviso'}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg disabled:opacity-50"
                        style={{ background: 'rgba(64,181,250,0.10)', color: '#40b5fa' }}>
                        {sending === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Reenviar{p.perfil_aviso_envios ? ` (${p.perfil_aviso_envios})` : ''}
                      </button>}
                </div>
              </div>
            ))}
          </div>
          {incompletos.length > 1 && (
            <button onClick={() => reenviar(incompletos.map(f => f.p.id))} disabled={!!sending}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white disabled:opacity-50"
              style={{ background: '#40b5fa' }}>
              {sending === 'todos' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Reenviar a los {incompletos.length} incompletos
            </button>
          )}
        </div>
      )}
    </div>
  )
}
