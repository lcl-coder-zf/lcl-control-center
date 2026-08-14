import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-guard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

// GET → { apagados: string[] }
export async function GET(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient() as AnyClient
  const { data, error } = await admin.from('modulos_sistema').select('slug').eq('activo', false)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ apagados: (data ?? []).map((r: { slug: string }) => r.slug) })
}

// PATCH { slug, activo } → prende/apaga un módulo (upsert)
export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const slug = String(b.slug ?? '').trim()
  const activo = b.activo !== false // default true
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })
  if (slug === 'configuracion') return NextResponse.json({ error: 'Configuración no se puede apagar.' }, { status: 400 })

  const admin = createAdminClient() as AnyClient
  const { error } = await admin.from('modulos_sistema')
    .upsert({ slug, activo, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
