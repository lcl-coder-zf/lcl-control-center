import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import type { Profile } from '@/types'

const DEFAULT_SETTINGS: Record<string, string> = {
  module_clientes:      'all',
  module_tareas:        'all',
  module_agenda:        'all',
  module_equipo:        'all',
  module_vault:         'admin',
  module_configuracion: 'admin',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: settingsRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('app_settings').select('key, value'),
  ])

  if (!profile) redirect('/login')

  const moduleSettings: Record<string, string> = {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries((settingsRows ?? []).map(r => [r.key, r.value])),
  }

  return (
    <AppShell profile={profile as Profile} moduleSettings={moduleSettings}>
      {children}
    </AppShell>
  )
}
