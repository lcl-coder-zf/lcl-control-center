import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret, decryptSecret } from '@/lib/vault-crypto'

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

// GET → lista de credenciales con la contraseña DESCIFRADA (solo admin). La
// clave se descifra en el servidor; la BD guarda ciphertext.
export async function GET(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient() as Any
  const { data, error } = await admin.from('vault_items').select('*').order('categoria').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data ?? []).map((it: Any) => ({ ...it, contrasena: decryptSecret(it.contrasena) }))
  return NextResponse.json({ items })
}

// POST → crea una credencial (la contraseña se guarda CIFRADA).
export async function POST(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const b = (await req.json().catch(() => ({}))) as Any
  if (!b?.nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })

  const admin = createAdminClient() as Any
  const row = {
    nombre: b.nombre,
    usuario: b.usuario || null,
    contrasena: encryptSecret(b.contrasena || null),
    url: b.url || null,
    notas: b.notas || null,
    categoria: b.categoria || 'otro',
  }
  const { data, error } = await admin.from('vault_items').insert([row]).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
