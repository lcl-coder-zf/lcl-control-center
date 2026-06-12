'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import Sidebar from './Sidebar'
import type { Profile } from '@/types'

export default function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Open by default on desktop, closed on mobile
    setOpen(window.innerWidth >= 1024)
    setMounted(true)
  }, [])

  const isDesktop = mounted && window.innerWidth >= 1024

  return (
    <div className="flex min-h-screen" style={{ background: '#f0f4f8' }}>
      {/* Mobile backdrop (overlay only on small screens) */}
      {open && mounted && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(10,22,40,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar profile={profile} isOpen={open} onClose={() => setOpen(false)} />

      {/* Main area – shifts on desktop when sidebar is open */}
      <div
        className="flex-1 flex flex-col min-h-screen"
        style={{
          transition: 'margin-left 0.3s ease',
          marginLeft: mounted && open ? '240px' : '0',
        }}>

        {/* Top bar – always visible */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ background: '#ffffff', borderBottom: '1px solid rgba(0,40,80,0.08)' }}>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-xl flex-shrink-0 transition-colors"
            style={{ background: '#f4f7fa', color: '#1a2e3b' }}
            aria-label="Toggle menú">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="LCL" width={22} height={22} className="rounded object-contain" />
            <span className="font-bold text-sm" style={{ color: '#1a2e3b' }}>LCL Control</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
