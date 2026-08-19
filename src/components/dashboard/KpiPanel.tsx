'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'
import type { ComponentType, CSSProperties } from 'react'

export interface KpiItem {
  id: string
  title: string
  subtitle?: string
  meta?: string
  metaColor?: string
  href?: string
}

interface Props {
  label: string
  value: number | string
  color: string
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>
  items: KpiItem[]
  emptyText?: string
  onClose: () => void
}

export default function KpiPanel({ label, value, color, Icon, items, emptyText = 'Nada por aquí', onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-[440px] bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(0,40,80,0.08)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <div className="text-3xl font-black leading-none" style={{ color }}>{value}</div>
                <div className="text-[11px] uppercase tracking-wider font-semibold mt-1.5" style={{ color: '#6b8fa0' }}>{label}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#f4f7fa] transition-colors" style={{ color: '#6b8fa0' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {items.length === 0 ? (
            <p className="text-sm text-center py-16" style={{ color: '#6b8fa0' }}>{emptyText}</p>
          ) : items.map(it => {
            const inner = (
              <div className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors hover:bg-[#f4f7fa]"
                style={{ background: '#f9fbfc', border: '1px solid rgba(0,40,80,0.05)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1a2e3b' }}>{it.title}</p>
                  {it.subtitle && <p className="text-[11px] truncate mt-0.5" style={{ color: '#86a2b2' }}>{it.subtitle}</p>}
                </div>
                {it.meta && <span className="text-xs font-semibold flex-shrink-0 tabular-nums" style={{ color: it.metaColor ?? '#6b8fa0' }}>{it.meta}</span>}
                {it.href && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#b0bcc7' }} />}
              </div>
            )
            return it.href
              ? <Link key={it.id} href={it.href} onClick={onClose} className="block">{inner}</Link>
              : <div key={it.id}>{inner}</div>
          })}
        </div>
      </aside>
    </>
  )
}
