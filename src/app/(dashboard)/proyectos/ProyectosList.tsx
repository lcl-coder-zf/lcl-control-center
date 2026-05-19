'use client'

import Link from 'next/link'
import { ChevronRight, FolderKanban } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  activo:     { bg: 'rgba(64,181,250,0.10)',  color: '#40b5fa', label: 'Activo' },
  completado: { bg: 'rgba(74,222,128,0.10)',  color: '#4ade80', label: 'Completado' },
  pausado:    { bg: 'rgba(255,217,61,0.10)',  color: '#ffd93d', label: 'Pausado' },
  cancelado:  { bg: 'rgba(255,107,107,0.10)', color: '#ff6b6b', label: 'Cancelado' },
}

const TYPE_COLORS: Record<string, string> = {
  BASC: '#40b5fa', ISO: '#a78bfa', SAGRILAFT: '#fb923c',
  PTEE: '#34d399', 'SG-SST': '#f472b6', Otro: '#86a2b2',
}

export default function ProyectosList({ projects }: { projects: any[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center py-20"
        style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
        <FolderKanban className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
        <p className="font-semibold" style={{ color: '#6b8fa0' }}>Sin proyectos</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {projects.map(p => {
        const st = STATUS_STYLES[p.status] ?? STATUS_STYLES.activo
        const typeColor = TYPE_COLORS[p.type] ?? '#86a2b2'
        return (
          <Link key={p.id} href={`/proyectos/${p.id}`}
            className="group rounded-2xl p-5 transition-all"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(64,181,250,0.25)'
              e.currentTarget.style.background = '#f4f8ff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(0,40,80,0.08)'
              e.currentTarget.style.background = '#ffffff'
            }}>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Tipo badge */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                  {p.type}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: '#1a2e3b' }}>{p.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {p.companies?.name && (
                      <span className="text-xs" style={{ color: '#6b8fa0' }}>{p.companies.name}</span>
                    )}
                    {p.profiles?.full_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa' }}>
                        {p.profiles.full_name}
                      </span>
                    )}
                    {p.end_date && (
                      <span className="text-xs" style={{ color: '#6b8fa0' }}>
                        Cierre: {formatDate(p.end_date)}
                      </span>
                    )}
                  </div>

                  {/* Barra progreso */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${p.progress ?? 0}%`, background: typeColor }} />
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: typeColor }}>
                      {p.progress ?? 0}%
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1 mt-1"
                style={{ color: '#6b8fa0' }} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
