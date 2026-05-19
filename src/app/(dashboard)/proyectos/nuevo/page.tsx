import { createClient } from '@/lib/supabase/server'
import NuevoProyectoForm from './NuevoProyectoForm'

export default async function NuevoProyectoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>
}) {
  const { cliente } = await searchParams
  const supabase = await createClient()

  const [{ data: companies }, { data: profiles }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  return <NuevoProyectoForm companies={companies ?? []} profiles={profiles ?? []} defaultClienteId={cliente} />
}
