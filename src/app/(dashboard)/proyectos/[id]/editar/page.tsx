import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditarProyectoForm from './EditarProyectoForm'

export default async function EditarProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: companies }, { data: profiles }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  if (!project) notFound()
  return <EditarProyectoForm project={project} companies={companies ?? []} profiles={profiles ?? []} />
}
