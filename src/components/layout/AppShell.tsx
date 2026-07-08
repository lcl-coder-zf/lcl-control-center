'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import Sidebar from './Sidebar'
import type { Profile } from '@/types'

export default function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sidebarPushesContent = isDesktop && open

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8', overflowX: 'hidden' }}>
      {/* Mobile backdrop */}
      {open && !isDesktop && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(10,22,40,0.45)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar
        profile={profile}
        isOpen={open}
        onClose={() => setOpen(false)}
        onToggle={() => setOpen(o => !o)}
      />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflowX: 'hidden',
        marginLeft: sidebarPushesContent ? 240 : 0,
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Mobile top bar */}
        {!isDesktop && (
          <header style={{
            position: 'sticky', top: 0, zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0 16px', height: 56, flexShrink: 0,
            background: '#ffffff', borderBottom: '1px solid rgba(0,40,80,0.08)',
          }}>
            <button
              onClick={() => setOpen(true)}
              style={{ padding: 8, borderRadius: 10, background: '#f4f7fa', color: '#1a2e3b', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image src="/icon.png" alt="LCL" width={22} height={22} style={{ borderRadius: 4, objectFit: 'contain' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2e3b' }}>LCL Control</span>
            </div>
          </header>
        )}

        {/* Desktop floating button when sidebar is closed */}
        {isDesktop && !open && (
          <button
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed', top: 16, left: 16, zIndex: 30,
              width: 40, height: 40, borderRadius: 10,
              background: '#ffffff', color: '#1a2e3b',
              border: '1px solid rgba(0,40,80,0.12)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <Menu size={18} />
          </button>
        )}

        <main style={{ flex: 1, overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
