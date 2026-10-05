'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { completitud } from '@/lib/perfil'
import PerfilForm from './PerfilForm'
import { UserCircle, X } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

/** Debe salir si nunca lo ha visto o si un admin lo reenvió después de verlo. */
function tocaAviso(p: Row): boolean {
  if (!('perfil_aviso_visto_at' in p)) return false // migración aún no corrida
  if (!p.perfil_aviso_visto_at) return true
  return !!p.perfil_aviso_enviado_at && new Date(p.perfil_aviso_enviado_at) > new Date(p.perfil_aviso_visto_at)
}

/**
 * Ventana "Completa tu perfil" al entrar a la app. Sale UNA vez por envío:
 * se marca visto apenas aparece (aunque cierren la pestaña sin tocar nada).
 * Si el perfil ya está al 100% no sale.
 */
export default function PerfilAviso({ profile }: { profile: Row }) {
  const [open, setOpen] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (!tocaAviso(profile)) return
    const sb = createClient()
    sb.from('profile_private').select('*').eq('profile_id', profile.id).maybeSingle().then(({ data }) => {
      if (completitud(profile, data ?? {}) === 100) return
      setOpen(true)
      sb.from('profiles').update({ perfil_aviso_visto_at: new Date().toISOString() }).eq('id', profile.id).then(() => {})
    })
  }, [profile])

  if (!open) return null

  const nombre = (profile.full_name ?? '').split(' ')[0]

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center p-0 lg:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full lg:max-w-2xl rounded-t-2xl lg:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="px-6 pt-5 pb-4 flex items-start gap-3" style={{ borderBottom: '1px solid rgba(0,40,80,0.08)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(64,181,250,0.15)' }}>
            <UserCircle className="w-5 h-5" style={{ color: '#40b5fa' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black" style={{ color: '#1a2e3b' }}>
              {guardado ? '¡Gracias!' : `Hola ${nombre}, completa tu perfil`}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6b8fa0' }}>
              {guardado
                ? 'Tu perfil quedó guardado. Lo puedes cambiar cuando quieras en Mi cuenta.'
                : 'Toma 2 minutos. Lo usamos para el directorio del equipo, cumpleaños y emergencias.'}
            </p>
          </div>
          <button onClick={() => setOpen(false)} title="Más tarde" className="p-1.5 rounded-lg" style={{ color: '#86a2b2' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          {guardado ? (
            <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#40b5fa' }}>
              Listo
            </button>
          ) : (
            <PerfilForm profile={profile} canEditStartDate={profile.role === 'admin'}
              onSaved={() => setGuardado(true)} onCancel={() => setOpen(false)} cancelLabel="Más tarde" />
          )}
          {!guardado && (
            <p className="text-[11px] mt-3 text-center" style={{ color: '#b0bcc7' }}>
              Si lo dejas para después, lo encuentras en <b>Mi cuenta → Mi perfil</b>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
