import { NextRequest } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Resuelve el id del usuario de la sesión. Acepta la sesión por COOKIE (SSR) o
// por Bearer token (como el resto de la app), para no fallar cuando la cookie
// expira pero el token de localStorage sigue vivo. Devuelve null si no hay sesión.
async function resolveUserId(req?: NextRequest): Promise<string | null> {
  // 1) Intento por cookie de sesión (SSR).
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user.id
  } catch { /* sin cookie válida, probamos token */ }

  // 2) Fallback: Bearer token del header.
  if (req) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const sb = createSbClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data: { user } } = await sb.auth.getUser()
      if (user) return user.id
    }
  }
  return null
}

// Cualquier usuario autenticado (miembro del equipo). Devuelve su id y rol, o
// null si no hay sesión. Úsalo en rutas que operan con service role pero que
// cualquier miembro del equipo puede llamar (el modelo de datos ya es team-wide).
export async function requireUser(req?: NextRequest): Promise<{ id: string; role: string } | null> {
  const userId = await resolveUserId(req)
  if (!userId) return null
  const admin = createAdminClient()
  const { data: perfil } = await admin.from('profiles').select('id, role').eq('id', userId).single()
  return { id: userId, role: (perfil as { role: string } | null)?.role ?? 'consultant' }
}

// Valida que quien llama sea super admin (role='admin').
export async function requireAdmin(req?: NextRequest): Promise<{ id: string } | null> {
  const user = await requireUser(req)
  if (!user || user.role !== 'admin') return null
  return { id: user.id }
}
