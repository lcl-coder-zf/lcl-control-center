import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import type { Profile } from '@/types'

export type ModuleAccess = {
  rol: string | null
  rolModulos: string[] | null                    // roles_app.modulos (null = defaults del código)
  modulosOverride: Record<string, boolean> | null // profiles.modulos_override
  modulosApagados: string[]                       // modulos_sistema apagados globalmente
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const p = profile as Profile & { modulos_override?: Record<string, boolean> | null }

  // Permisos del rol + módulos apagados globalmente (RLS: lectura para autenticados).
  const [{ data: rolRow }, { data: apagadosRows }] = await Promise.all([
    supabase.from('roles_app').select('modulos').eq('slug', p.role).maybeSingle(),
    supabase.from('modulos_sistema').select('slug').eq('activo', false),
  ])

  const access: ModuleAccess = {
    rol: p.role,
    rolModulos: (rolRow as { modulos: string[] | null } | null)?.modulos ?? null,
    modulosOverride: p.modulos_override ?? null,
    modulosApagados: (apagadosRows ?? []).map((r) => r.slug),
  }

  return (
    <AppShell profile={profile as Profile} access={access}>
      {children}
    </AppShell>
  )
}
