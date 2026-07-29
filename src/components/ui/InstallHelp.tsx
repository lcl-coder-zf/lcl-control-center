'use client'

import { useState } from 'react'
import { HelpCircle, ChevronDown, Smartphone } from 'lucide-react'

type Plataforma = 'ios' | 'android'

const PASOS: Record<Plataforma, { titulo: string; pasos: string[] }> = {
  ios: {
    titulo: 'iPhone / iPad',
    pasos: [
      'Abre esta página en **Safari** (no funciona desde Chrome ni desde el navegador de WhatsApp).',
      'Toca el botón **Compartir** — el cuadrito con la flecha hacia arriba, abajo en el centro.',
      'Baja en la lista y toca **Agregar a pantalla de inicio**.',
      'Toca **Agregar** arriba a la derecha. Aparece el ícono de LCL en tu pantalla.',
      'Cierra Safari y **abre la app desde ese ícono**. Este paso es obligatorio: iPhone solo permite notificaciones si entras por el ícono.',
      'Adentro, ve a **Configuración → Activar notificaciones** y toca **Permitir**.',
    ],
  },
  android: {
    titulo: 'Android',
    pasos: [
      'Abre esta página en **Chrome**.',
      'Toca el menú **⋮** arriba a la derecha.',
      'Toca **Instalar aplicación** (o **Agregar a pantalla principal**).',
      'Confirma. Aparece el ícono de LCL en tu pantalla.',
      'Abre la app desde ese ícono.',
      'Adentro, ve a **Configuración → Activar notificaciones** y toca **Permitir**.',
    ],
  },
}

/** Renderiza **negrita** sin traer una librería de markdown. */
function Texto({ children }: { children: string }) {
  return (
    <>
      {children.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
        parte.startsWith('**') && parte.endsWith('**')
          ? <b key={i} style={{ color: '#1a2e3b' }}>{parte.slice(2, -2)}</b>
          : <span key={i}>{parte}</span>
      )}
    </>
  )
}

export default function InstallHelp() {
  const [abierto, setAbierto] = useState(false)
  const [tab, setTab]         = useState<Plataforma>('android')
  const [url, setUrl]         = useState('')

  // Se detecta al abrir, no en un efecto: así no hay desajuste de hidratación
  // ni render en cascada, y de todos modos nadie lee esto sin abrirlo.
  function abrir() {
    if (!abierto) {
      const ua = navigator.userAgent
      const esIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
      setTab(esIOS ? 'ios' : 'android')
      setUrl(window.location.origin)
    }
    setAbierto(o => !o)
  }

  return (
    <div className="mt-4">
      <button
        onClick={abrir}
        className="inline-flex items-center gap-2 text-xs font-semibold"
        style={{ color: '#40b5fa', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <HelpCircle className="w-3.5 h-3.5" />
        ¿Cómo las activo en el celular?
        <ChevronDown className="w-3.5 h-3.5" style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {abierto && (
        <div className="mt-3 rounded-xl p-4" style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-3.5 h-3.5" style={{ color: '#6b8fa0' }} />
            <p className="text-[11px]" style={{ color: '#6b8fa0' }}>
              Las notificaciones llegan a la pantalla bloqueada solo si instalas la app en el celular.
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            {(Object.keys(PASOS) as Plataforma[]).map(p => (
              <button key={p} onClick={() => setTab(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: tab === p ? 'rgba(64,181,250,0.12)' : '#fff',
                  color:      tab === p ? '#40b5fa' : '#6b8fa0',
                  border:     `1px solid ${tab === p ? 'rgba(64,181,250,0.25)' : 'rgba(0,40,80,0.08)'}`,
                  cursor: 'pointer',
                }}>
                {PASOS[p].titulo}
              </button>
            ))}
          </div>

          <ol className="space-y-2.5">
            {PASOS[tab].pasos.map((paso, i) => (
              <li key={i} className="flex gap-3 text-xs leading-relaxed" style={{ color: '#4a5a6b' }}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'rgba(64,181,250,0.15)', color: '#40b5fa' }}>{i + 1}</span>
                <span className="flex-1"><Texto>{paso}</Texto></span>
              </li>
            ))}
          </ol>

          {url && (
            <p className="text-[11px] mt-4 pt-3" style={{ color: '#86a2b2', borderTop: '1px solid rgba(0,40,80,0.06)' }}>
              Dirección de la app: <b style={{ color: '#6b8fa0' }}>{url}</b>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
