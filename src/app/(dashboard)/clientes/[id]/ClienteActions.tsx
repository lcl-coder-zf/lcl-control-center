'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ClienteActions({ id }: { id: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('¿Eliminar este cliente? Se eliminarán todos sus proyectos y tareas.')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('companies').delete().eq('id', id)
    router.push('/clientes')
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <Link href={`/clientes/${id}/editar`}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#f4f7fa', color: '#6b8fa0', border: '1px solid rgba(0,40,80,0.10)' }}>
        <Pencil className="w-4 h-4" />Editar
      </Link>
      <button onClick={handleDelete} disabled={deleting}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(255,107,107,0.10)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)' }}>
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Eliminar
      </button>
    </div>
  )
}
