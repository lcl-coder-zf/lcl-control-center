'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, FolderKanban, CheckSquare,
  CalendarClock, FileText, LogOut, ChevronRight, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { ROLE_LABELS } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',    icon: Building2,        label: 'Clientes' },
  { href: '/proyectos',   icon: FolderKanban,     label: 'Proyectos' },
  { href: '/tareas',      icon: CheckSquare,      label: 'Tareas' },
  { href: '/calendario',  icon: CalendarClock,    label: 'Vencimientos' },
  { href: '/documentos',  icon: FileText,         label: 'Documentos' },
]

interface SidebarProps {
  profile: Profile
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ profile, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleNav() {
    onClose?.()
  }

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside
      className={[
        'fixed left-0 top-0 bottom-0 z-50 flex flex-col',
        'w-[260px] lg:w-[240px]',
        'transition-transform duration-300 ease-in-out',
        // Mobile: translate off-screen when closed; Desktop: always visible
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
      style={{ background: '#ffffff', borderRight: '1px solid rgba(0,40,80,0.10)' }}>

      {/* Brand */}
      <div className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(0,40,80,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.10)' }}>
            <Image src="/icon.png" alt="LCL" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide" style={{ color: '#1a2e3b' }}>LCL Control</p>
            <p className="text-[10px] tracking-widest uppercase" style={{ color: '#6b8fa0' }}>Center</p>
          </div>
        </div>
        {/* Close button – mobile only */}
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg"
          style={{ color: '#6b8fa0', background: '#f4f7fa' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} onClick={handleNav}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'rgba(64,181,250,0.12)' : 'transparent',
                color: active ? '#40b5fa' : '#6b8fa0',
                border: active ? '1px solid rgba(64,181,250,0.20)' : '1px solid transparent',
              }}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(0,40,80,0.08)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: 'rgba(0,0,0,0.03)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(64,181,250,0.2)', color: '#40b5fa' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#1a2e3b' }}>{profile.full_name}</p>
            <p className="text-[10px]" style={{ color: '#6b8fa0' }}>
              {ROLE_LABELS[profile.email] ?? (profile.role === 'admin' ? 'Administrador' : 'Consultor')}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: '#6b8fa0' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b8fa0')}>
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
