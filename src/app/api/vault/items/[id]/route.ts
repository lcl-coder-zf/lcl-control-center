import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret } from '@/lib/vault-crypto'

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

// PATCH → edita una credencial (la contraseña se re-cifra si viene).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const b = (await req.json().catch(() => ({}))) as Any
  const admin = createAdminClient() as Any

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b.nombre     !== undefined) patch.nombre     = b.nombre
  if (b.usuario    !== undefined) patch.usuario    = b.usuario || null
  if (b.contrasena !== undefined) patch.contrasena = encryptSecret(b.contrasena || null)
  if (b.url        !== undefined) patch.url        = b.url || null
  if (b.notas      !== undefined) patch.notas      = b.notas || null
  if (b.categoria  !== undefined) patch.categoria  = b.categoria

  const { error } = await admin.from('vault_items').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE → borra una credencial.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient() as Any
  const { error } = await admin.from('vault_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
