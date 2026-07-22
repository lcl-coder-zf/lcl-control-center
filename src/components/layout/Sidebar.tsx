'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, CheckSquare,
  CalendarClock, LogOut, ChevronRight, X, ChevronLeft, KeyRound, Settings, Users, CalendarRange,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { ROLE_LABELS } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',     module: null },
  { href: '/clientes',      icon: Building2,       label: 'Clientes',      module: 'clientes' },
  { href: '/tareas',        icon: CheckSquare,     label: 'Tareas',        module: 'tareas' },
  { href: '/agenda',        icon: CalendarClock,   label: 'Agenda',        module: 'agenda' },
  { href: '/cronograma',    icon: CalendarRange,   label: 'Cronograma',    module: 'cronograma' },
  { href: '/equipo',        icon: Users,           label: 'Equipo',        module: 'equipo' },
  { href: '/vault',         icon: KeyRound,        label: 'Vault',         module: 'vault' },
  { href: '/configuracion', icon: Settings,        label: 'Configuración', module: 'configuracion' },
]

interface SidebarProps {
  profile: Profile
  moduleSettings: Record<string, string>
  isOpen: boolean
  onClose: () => void
  onToggle?: () => void
}

export default function Sidebar({ profile, moduleSettings, isOpen, onClose, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  function isVisible(module: string | null) {
    if (!module) return true
    const setting = moduleSettings[`module_${module}`] ?? 'all'
    return setting === 'all' || (setting === 'admin' && profile.role === 'admin')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        width: 240,
        background: '#ffffff',
        borderRight: '1px solid rgba(0,40,80,0.10)',
        display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        overflow: 'hidden',
      }}>

      {/* Brand */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,40,80,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,40,80,0.10)', flexShrink: 0 }}>
          <Image src="/icon-192.png" alt="LCL" width={32} height={32} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2e3b', margin: 0, letterSpacing: '0.02em' }}>LCL Control</p>
          <p style={{ fontSize: 10, color: '#6b8fa0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Center</p>
        </div>
        {onToggle && (
          <button onClick={onToggle}
            style={{ padding: 6, borderRadius: 8, background: '#f4f7fa', color: '#6b8fa0', border: 'none', cursor: 'pointer', display: 'none' }}
            className="lg-collapse-btn">
            <ChevronLeft size={16} />
          </button>
        )}
        <button onClick={onClose}
          style={{ padding: 6, borderRadius: 8, background: '#f4f7fa', color: '#6b8fa0', border: 'none', cursor: 'pointer' }}
          className="mobile-close-btn">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.filter(item => isVisible(item.module)).map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12, marginBottom: 2,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                background: active ? 'rgba(64,181,250,0.12)' : 'transparent',
                color: active ? '#40b5fa' : '#6b8fa0',
                border: active ? '1px solid rgba(64,181,250,0.20)' : '1px solid transparent',
              }}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={12} style={{ opacity: 0.6 }} />}
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(0,40,80,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.03)', marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(64,181,250,0.2)', color: '#40b5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1a2e3b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name}</p>
            <p style={{ fontSize: 10, color: '#6b8fa0', margin: 0 }}>
              {ROLE_LABELS[profile.email] ?? (profile.role === 'admin' ? 'Administrador' : 'Consultor')}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b8fa0', fontSize: 14 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b8fa0')}>
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
