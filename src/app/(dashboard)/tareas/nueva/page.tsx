import { createClient } from '@/lib/supabase/server'
import NuevaTareaForm from './NuevaTareaForm'

export default async function NuevaTareaPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string; cliente?: string }>
}) {
  const { proyecto, cliente } = await searchParams
  const supabase = await createClient()

  const [{ data: companies }, { data: projects }, { data: profiles }, { data: user }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
    supabase.from('projects').select('id, name, company_id').eq('status', 'activo').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.auth.getUser(),
  ])

  const { data: currentProfile } = await supabase
    .from('profiles').select('id').eq('id', user.user?.id ?? '').single()

  return (
    <NuevaTareaForm
      companies={companies ?? []}
      projects={projects ?? []}
      profiles={profiles ?? []}
      defaultProjectId={proyecto}
      defaultClienteId={cliente}
      currentUserId={currentProfile?.id}
    />
  )
}
