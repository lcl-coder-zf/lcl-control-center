import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'

// POST { pin } → valida el PIN del Vault contra VAULT_PIN (env del servidor).
// El PIN ya NO vive en el bundle del cliente. Doble capa: hay que ser admin
// (el RLS de vault_items es admin-only) y además saber el PIN.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string }
  const expected = process.env.VAULT_PIN
  // Fail-closed: sin VAULT_PIN configurado, no se desbloquea.
  if (!expected) return NextResponse.json({ error: 'Vault sin configurar (falta VAULT_PIN)' }, { status: 500 })
  if (typeof pin !== 'string' || pin !== expected) {
    return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
