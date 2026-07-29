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
  if (!title) return NextResponse.json({ error: 'title requerido' }, { status: 400 })

  const destinos: string[] = Array.isArray(recipientIds)
    ? recipientIds.filter((id: unknown): id is string => typeof id === 'string' && !!id)
    : []

  if (toAdmins) destinos.push(...(await getAdmins()).map((a) => a.id))

  // Sin push para quien acaba de hacer la acción, igual que notify() in-app.
  const finales = [...new Set(destinos)].filter((id) => id !== actorId)
  if (!finales.length) return NextResponse.json({ ok: true, sent: 0, removed: 0 })

  const res = await sendPushToProfiles(finales, {
    title,
    body: body ?? '',
    url: url ?? '/dashboard',
    tag: tag ?? 'lcl',
  })
  return NextResponse.json({ ok: true, ...res })
}
