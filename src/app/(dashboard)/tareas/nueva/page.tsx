import { createClient } from '@/lib/supabase/server'
import NuevaTareaForm from './NuevaTareaForm'

export default async function NuevaTareaPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; titulo?: string }>
}) {
  const { cliente, titulo } = await searchParams
  const supabase = await createClient()

  const [{ data: companies }, { data: profiles }, { data: user }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('status', 'activo').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.auth.getUser(),
  ])

  const { data: currentProfile } = await supabase
    .from('profiles').select('id').eq('id', user.user?.id ?? '').single()

  return (
    <NuevaTareaForm
      companies={companies ?? []}
      profiles={profiles ?? []}
      defaultClienteId={cliente}
      defaultTitulo={titulo}
      currentUserId={currentProfile?.id}
    />
  )
}
