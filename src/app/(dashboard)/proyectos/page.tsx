'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ProyectosList from './ProyectosList'
import { createClient } from '@/lib/supabase/client'
import { PageSkeleton } from '@/components/ui/Skeleton'

export default function ProyectosPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('todos')

  useEffect(() => {
    createClient()
      .from('projects')
      .select('*, companies(id, name, logo_url, service_type), profiles(id, full_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setProjects(data ?? []); setLoading(false) })
  }, [])

  const filtered = useMemo(() =>
    projects.filter(p => status === 'todos' || p.status === status),
    [projects, status]
  )

  const counts = {
    activo:     projects.filter(p => p.status === 'activo').length,
    completado: projects.filter(p => p.status === 'completado').length,
    pausado:    projects.filter(p => p.status === 'pausado').length,
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#40b5fa' }}>Módulo 02</p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1a2e3b' }}>Proyectos</h1>
          <p className="text-sm mt-1" style={{ color: '#6b8fa0' }}>{filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/proyectos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: '#40b5fa', color: '#ffffff' }}>
          <Plus className="w-4 h-4" />Nuevo proyecto
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Activos', value: counts.activo, color: '#40b5fa' },
          { label: 'Completados', value: counts.completado, color: '#4ade80' },
          { label: 'Pausados', value: counts.pausado, color: '#ffd93d' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: '#ffffff', border: '1px solid rgba(0,40,80,0.08)' }}>
            <span className="text-xs uppercase tracking-wider" style={{ color: '#6b8fa0' }}>{s.label}</span>
            <span className="text-xl font-black" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['todos', 'activo', 'pausado', 'completado', 'cancelado'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
            style={{
              background: status === s ? 'rgba(64,181,250,0.15)' : '#f4f7fa',
              color: status === s ? '#40b5fa' : '#6b8fa0',
              border: `1px solid ${status === s ? 'rgba(64,181,250,0.3)' : 'rgba(0,40,80,0.08)'}`,
            }}>
            {s}
          </button>
        ))}
      </div>

      <ProyectosList projects={filtered} />
    </div>
  )
}
