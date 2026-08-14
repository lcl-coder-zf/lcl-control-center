import { NextRequest } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Valida que quien llama sea super admin (role='admin'). Acepta la sesión por
// COOKIE (SSR) o por Bearer token (como el resto de la app), para no fallar
// cuando la cookie expira pero el token de localStorage sigue vivo.
export async function requireAdmin(req?: NextRequest): Promise<{ id: string } | null> {
  let userId: string | null = null

  // 1) Intento por cookie de sesión (SSR).
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch { /* sin cookie válida, probamos token */ }

  // 2) Fallback: Bearer token del header.
  if (!userId && req) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const sb = createSbClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data: { user } } = await sb.auth.getUser()
      if (user) userId = user.id
    }
  }
  if (!userId) return null

  // Rol desde profiles (service role, sin depender del contexto de auth).
  const admin = createAdminClient()
  const { data: perfil } = await admin.from('profiles').select('id, role').eq('id', userId).single()
  const role = (perfil as { role: string } | null)?.role
  if (role !== 'admin') return null
  return { id: userId }
}
