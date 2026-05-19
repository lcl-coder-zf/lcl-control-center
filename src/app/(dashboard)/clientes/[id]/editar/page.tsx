import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditarClienteForm from './EditarClienteForm'

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: company } = await supabase.from('companies').select('*').eq('id', id).single()
  if (!company) notFound()
  return <EditarClienteForm company={company} />
}
