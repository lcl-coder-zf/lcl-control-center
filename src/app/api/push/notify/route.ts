import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdmins, sendPushToProfiles } from '@/lib/push'

// Identifica a quien llama con su sesión de Supabase. Sin sesión no se envía
// nada: si no, cualquiera podría dispararle un push a todo el equipo.
async function actorDeLaPeticion(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    const { data } = await sb.auth.getUser()
    return data?.user?.id ?? null
  } catch {
    return null
  }
}

// POST /api/push/notify  { title, body?, url?, recipientIds?: string[], toAdmins?: boolean }
// Enrutado por persona: le llega solo a los destinatarios indicados. `toAdmins`
// suma a los role='admin' del lado del servidor (Laura, Daniel — reciben todo).
export async function POST(req: NextRequest) {
  const actorId = await actorDeLaPeticion(req)
  if (!actorId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { title, body, url, recipientIds, toAdmins, tag } = await req.json().catch(() => ({}))
  if (!title || typeof title !== 'string') return NextResponse.json({ error: 'title requerido' }, { status: 400 })

  // Caps para acotar abuso desde una sesión: es una herramienta interna, pero un
  // solo POST no debería poder disparar un blast ilimitado ni payloads enormes.
  const t = title.slice(0, 200)
  const b = typeof body === 'string' ? body.slice(0, 1000) : ''

  const destinos: string[] = Array.isArray(recipientIds)
    ? recipientIds.filter((id: unknown): id is string => typeof id === 'string' && !!id).slice(0, 50)
    : []

  if (toAdmins) destinos.push(...(await getAdmins()).map((a) => a.id))

  // Sin push para quien acaba de hacer la acción, igual que notify() in-app.
  const finales = [...new Set(destinos)].filter((id) => id !== actorId)
  if (!finales.length) return NextResponse.json({ ok: true, sent: 0, removed: 0 })

  const res = await sendPushToProfiles(finales, {
    title: t,
    body: b,
    url: typeof url === 'string' ? url : '/dashboard',
    tag: typeof tag === 'string' ? tag : 'lcl',
  })
  return NextResponse.json({ ok: true, ...res })
}
