import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-guard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

// GET → lista de usuarios (perfiles)
export async function GET(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient() as AnyClient
  const { data, error } = await admin.from('profiles').select('*').order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ usuarios: data })
}

// POST → crea un usuario (auth + perfil) y lo guarda en el vault de logins
export async function POST(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { full_name, email, role, password } = body as {
    full_name?: string; email?: string; role?: string; password?: string
  }
  if (!full_name || !email || !role || !password) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  try {
    const admin = createAdminClient() as AnyClient
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // El trigger on_auth_user_created crea el perfil. Esperamos un momento y
    // corregimos nombre/rol con los valores exactos del formulario.
    await new Promise((r) => setTimeout(r, 800))
    await admin.from('profiles')
      .update({ full_name, role, activo: true })
      .eq('id', data.user.id)

    // Guardar el login en el vault de usuarios del sistema (pass en claro, service role).
    // No rompe el alta si la tabla no existe todavía.
    try {
      await admin.from('usuarios_sistema').upsert(
        { nombre: full_name, email: email.trim().toLowerCase(), pass: password, rol: role, updated_at: new Date().toISOString() },
        { onConflict: 'email' },
      )
    } catch { /* la tabla puede no existir aún; no bloquear el alta */ }

    return NextResponse.json({ ok: true, id: data.user.id }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH → edita un usuario (nombre, email, rol, activo, override de módulos, contraseña)
export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { id, full_name, email, role, activo, oculta_tareas, modulos_override, password } = body as {
    id?: string; full_name?: string; email?: string; role?: string; activo?: boolean
    oculta_tareas?: boolean; modulos_override?: Record<string, boolean> | null; password?: string
  }
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const admin = createAdminClient() as AnyClient

  // Cambios en Supabase Auth (email y/o contraseña)
  if (email || password) {
    const authPatch: Record<string, unknown> = {}
    if (email) authPatch.email = email.trim().toLowerCase()
    if (password) authPatch.password = password
    const { error: authErr } = await admin.auth.admin.updateUserById(id, authPatch)
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  // Campos en la tabla profiles
  const update: Record<string, unknown> = {}
  if (full_name        !== undefined) update.full_name        = full_name
  if (email            !== undefined) update.email            = email?.trim().toLowerCase()
  if (role             !== undefined) update.role             = role
  if (activo           !== undefined) update.activo           = activo
  if (oculta_tareas    !== undefined) update.oculta_tareas    = oculta_tareas
  if (modulos_override !== undefined) update.modulos_override = modulos_override

  if (Object.keys(update).length) {
    const { error } = await admin.from('profiles').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reflejar en el vault de logins
  if (email || password || full_name || role) {
    try {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (full_name) patch.nombre = full_name
      if (email) patch.email = email.trim().toLowerCase()
      if (password) patch.pass = password
      if (role) patch.rol = role
      if (email) await admin.from('usuarios_sistema').update(patch).eq('email', email.trim().toLowerCase())
    } catch { /* no bloquear */ }
  }

  return NextResponse.json({ ok: true })
}
