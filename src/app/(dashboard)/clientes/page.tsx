'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import ClientesList from './ClientesList'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import type { Company } from '@/types'

export default function ClientesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('todos')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('companies').select('*').order('name').then(({ data }) => {
      setCompanies(data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return companies.filter(c => {
      const matchStatus = status === 'todos' || c.status === status
      const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase())
      return matchStatus && matchQ
    })
  }, [companies, q, status])

  const totalActivos = companies.filter(c => c.status === 'activo').length
  const totalInactivos = companies.filter(c => c.status === 'inactivo').length

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 01</p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Clientes</h1>
          <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/clientes/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#40b5fa', color: '#ffffff' }}>
          <Plus className="w-4 h-4" />Nuevo cliente
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: companies.length, color: '#40b5fa' },
          { label: 'Activos', value: totalActivos, color: '#4ade80' },
          { label: 'Inactivos', value: totalInactivos, color: '#86a2b2' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <span className="text-xs uppercase tracking-wider" style={{ color: '#6b8fa0' }}>{s.label}</span>
            <span className="text-xl font-black" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b8fa0' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#f4f7fa', border: '1px solid rgba(0,40,80,0.10)', color: '#1a2e3b' }} />
        </div>
        <div className="flex gap-2">
          {['todos', 'activo', 'inactivo'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className="px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: status === s ? 'rgba(64,181,250,0.15)' : '#f4f7fa',
                color: status === s ? '#40b5fa' : '#6b8fa0',
                border: `1px solid ${status === s ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <ClientesList companies={filtered} />
    </div>
  )
}
