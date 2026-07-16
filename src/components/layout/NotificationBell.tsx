'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, CheckCheck, CalendarDays, CheckSquare, Building2, Gauge } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Noti = any

const ICON: Record<string, React.ElementType> = {
  tarea_asignada: CheckSquare,
  evento_invitado: CalendarDays,
  cliente_nuevo: Building2,
  indicador_nuevo: Gauge,
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Noti[]>([])
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
    setItems(data ?? [])
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000) // refresca cada 30s
    return () => clearInterval(t)
  }, [load])

  // Cerrar al hacer click afuera.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter(n => !n.read).length

  async function markAllRead() {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function openNoti(n: Noti) {
    if (!n.read) {
      const supabase = createClient()
      await supabase.from('notifications').update({ read: true }).eq('id', n.id)
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'ahora'
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
  }

  return (
    <div ref={ref} style={{ position: 'fixed', top: 16, right: 16, zIndex: 40 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid rgba(0,40,80,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
        <Bell size={18} style={{ color: '#1a2e3b' }} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: '#ff6b6b', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 48, right: 0, width: 340, maxHeight: 440, overflowY: 'auto', background: '#fff', borderRadius: 16, border: '1px solid rgba(0,40,80,0.10)', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(0,40,80,0.08)', position: 'sticky', top: 0, background: '#fff' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2e3b' }}>Notificaciones</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 600, color: '#40b5fa', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                <CheckCheck size={13} />Marcar leídas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b8fa0', fontSize: 13 }}>Sin notificaciones</div>
          ) : (
            items.map(n => {
              const Icon = ICON[n.type] ?? Bell
              return (
                <button key={n.id} onClick={() => openNoti(n)}
                  style={{ width: '100%', display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(0,40,80,0.05)', background: n.read ? '#fff' : 'rgba(64,181,250,0.05)', border: 'none', borderLeft: n.read ? '3px solid transparent' : '3px solid #40b5fa', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(64,181,250,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} style={{ color: '#40b5fa' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: '#1a2e3b', margin: 0, lineHeight: 1.35 }}>{n.message}</p>
                    <span style={{ fontSize: 11, color: '#86a2b2' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.read && <Check size={13} style={{ color: '#40b5fa', flexShrink: 0 }} />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
