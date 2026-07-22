'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

type Estado = 'cargando' | 'no-soportado' | 'inactivo' | 'activo' | 'bloqueado' | 'trabajando'

export default function PushToggle({ topics }: { topics?: string[] }) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [msg, setMsg]       = useState<string | null>(null)

  async function getToken(): Promise<string | null> {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  async function registrarBackend(sub: PushSubscription): Promise<boolean> {
    const token = await getToken()
    const r = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ subscription: sub.toJSON(), topics: topics ?? ['general'] }),
    })
    return r.ok
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('no-soportado'); return
    }
    if (Notification.permission === 'denied') { setEstado('bloqueado'); return }
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await registrarBackend(sub).catch(() => {})
          setEstado('activo')
        } else {
          setEstado('inactivo')
        }
      } catch { setEstado('inactivo') }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function activar() {
    setEstado('trabajando'); setMsg(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setEstado('bloqueado'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const res = await fetch('/api/push/vapid')
      const { publicKey } = await res.json()
      if (!publicKey) { setMsg('VAPID no configurado en el servidor.'); setEstado('inactivo'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      const ok = await registrarBackend(sub)
      if (!ok) { setMsg('No se pudo guardar la suscripción.'); setEstado('inactivo'); return }

      setEstado('activo')
      const topic = topics?.[0] ?? 'general'
      fetch(`/api/push/test?topic=${encodeURIComponent(topic)}`, { method: 'POST' }).catch(() => {})
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error activando notificaciones.')
      setEstado('inactivo')
    }
  }

  async function probar() {
    setMsg(null)
    const topic = topics?.[0] ?? 'general'
    const r = await fetch(`/api/push/test?topic=${encodeURIComponent(topic)}`, { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    setMsg(j?.sent ? `Enviada a ${j.sent} dispositivo(s).` : 'Nadie suscrito todavía.')
  }

  if (estado === 'cargando') return (
    <span className="inline-flex items-center gap-2 text-sm" style={{ color: '#86a2b2' }}>
      <Loader2 size={16} className="animate-spin" /> Cargando...
    </span>
  )
  if (estado === 'no-soportado') return (
    <span className="inline-flex items-center gap-2 text-sm" style={{ color: '#86a2b2' }}>
      <BellOff size={16} /> No soportado en este navegador
    </span>
  )
  if (estado === 'bloqueado') return (
    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
      style={{ background: 'rgba(255,107,107,0.08)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)' }}>
      <BellOff size={16} /> Bloqueadas — actívalas desde ajustes del navegador
    </span>
  )
  if (estado === 'activo') return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
        style={{ background: 'rgba(74,222,128,0.10)', color: '#059669', border: '1px solid rgba(74,222,128,0.25)' }}>
        <BellRing size={16} /> Notificaciones activas
      </span>
      <button onClick={probar} className="text-xs underline underline-offset-2" style={{ color: '#86a2b2' }}>
        Probar
      </button>
      {msg && <span className="text-xs" style={{ color: '#6b8fa0' }}>{msg}</span>}
    </div>
  )

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={activar} disabled={estado === 'trabajando'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: '#40b5fa' }}>
        {estado === 'trabajando' ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
        Activar notificaciones
      </button>
      {msg && <span className="text-xs" style={{ color: '#ff6b6b' }}>{msg}</span>}
    </div>
  )
}
