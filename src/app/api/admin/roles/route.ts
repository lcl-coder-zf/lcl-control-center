import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-guard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

// GET → lista de roles
export async function GET(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient() as AnyClient
  const { data, error } = await admin.from('roles_app').select('*')
    .order('es_sistema', { ascending: false }).order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ roles: data })
}

// POST → crea un rol nuevo
export async function POST(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { nombre, descripcion, color, modulos } = body as {
    nombre?: string; descripcion?: string; color?: string; modulos?: string[]
  }
  if (!nombre || !nombre.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  // slug: minúsculas, sin acentos ni espacios
  const slug = nombre.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  if (!slug) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })

  const admin = createAdminClient() as AnyClient
  const { data: existe } = await admin.from('roles_app').select('slug').eq('slug', slug).maybeSingle()
  if (existe) return NextResponse.json({ error: `Ya existe un rol con ese nombre (${slug})` }, { status: 400 })

  const { data, error } = await admin.from('roles_app').insert({
    slug,
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    color: color || 'bg-slate-600 text-white',
    modulos: Array.isArray(modulos) ? modulos : [],
    es_sistema: false,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Nota: profiles.role es text (sin enum), así que el slug se puede asignar directo.
  return NextResponse.json({ rol: data }, { status: 201 })
}

// PATCH → edita un rol (nombre, color, descripcion, modulos)
export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { slug, nombre, descripcion, color, modulos } = body as {
    slug?: string; nombre?: string; descripcion?: string; color?: string; modulos?: string[] | null
  }
  if (!slug) return NextResponse.json({ error: 'Falta el slug del rol' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (nombre      !== undefined) patch.nombre      = nombre.trim()
  if (descripcion !== undefined) patch.descripcion = descripcion?.trim() || null
  if (color       !== undefined) patch.color       = color
  if (modulos     !== undefined) patch.modulos     = modulos // array o null (null = defaults del código)

  const admin = createAdminClient() as AnyClient
  const { data, error } = await admin.from('roles_app').update(patch).eq('slug', slug).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ rol: data })
}

// DELETE ?slug=xxx → borra un rol (no de sistema, sin usuarios asignados)
export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin(req)
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Falta el slug' }, { status: 400 })

  const admin = createAdminClient() as AnyClient
  const { data: rol } = await admin.from('roles_app').select('es_sistema').eq('slug', slug).single()
  if (!rol) return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
  if ((rol as { es_sistema: boolean }).es_sistema) {
    return NextResponse.json({ error: 'No se puede borrar un rol de sistema' }, { status: 400 })
  }

  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', slug)
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `Hay ${count} usuario(s) con este rol. Reasígnalos antes de borrarlo.` }, { status: 400 })
  }

  const { error } = await admin.from('roles_app').delete().eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
