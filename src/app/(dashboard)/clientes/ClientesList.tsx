'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Building2, MapPin, Phone, ChevronRight } from 'lucide-react'
import type { Company } from '@/types'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  activo:    { bg: 'rgba(74,222,128,0.10)',  color: '#4ade80', label: 'Activo' },
  inactivo:  { bg: 'rgba(134,162,178,0.10)', color: '#86a2b2', label: 'Inactivo' },
  suspendido:{ bg: 'rgba(255,107,107,0.10)', color: '#ff6b6b', label: 'Suspendido' },
}

export default function ClientesList({ companies }: { companies: Company[] }) {
  if (companies.length === 0) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center py-20"
        style={{ background: '#fafbfc', border: '1px solid rgba(0,40,80,0.07)' }}>
        <Building2 className="w-12 h-12 mb-4" style={{ color: '#6b8fa0' }} />
        <p className="font-semibold" style={{ color: '#6b8fa0' }}>No hay clientes</p>
        <p className="text-sm mt-1" style={{ color: '#86a2b2', opacity: 0.6 }}>Agrega el primer cliente</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {companies.map(c => {
        const st = STATUS_STYLES[c.status] ?? STATUS_STYLES.inactivo
        return (
          <Link key={c.id} href={`/clientes/${c.id}`}
            className="group rounded-2xl p-5 flex items-center gap-5 transition-all"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(64,181,250,0.25)'
              e.currentTarget.style.background = '#f4f8ff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(0,40,80,0.08)'
              e.currentTarget.style.background = '#ffffff'
            }}>

            {/* Logo o iniciales */}
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 text-sm font-black"
              style={{ background: 'rgba(64,181,250,0.12)', color: '#40b5fa' }}>
              {c.logo_url
                ? <Image src={c.logo_url} alt={c.name} width={40} height={40} className="w-full h-full object-cover" />
                : c.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm" style={{ color: '#1a2e3b' }}>{c.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {c.nit && (
                  <span className="text-xs" style={{ color: '#6b8fa0' }}>NIT: {c.nit}</span>
                )}
                {c.city && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#6b8fa0' }}>
                    <MapPin className="w-3 h-3" />{c.city}
                  </span>
                )}
                {Array.isArray(c.service_type) && c.service_type.length > 0 && c.service_type.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(64,181,250,0.08)', color: '#40b5fa' }}>
                    {s}
                  </span>
                ))}
                {c.contact_phone && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#6b8fa0' }}>
                    <Phone className="w-3 h-3" />{c.contact_phone}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1"
              style={{ color: '#6b8fa0' }} />
          </Link>
        )
      })}
    </div>
  )
}
