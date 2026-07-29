import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToEmails } from '@/lib/push'

// POST /api/push/test — prueba SOLO a los dispositivos de quien la pide.
// Antes iba por topic, así que cada vez que alguien activaba notificaciones
// le llegaba el "activadas correctamente" a todo el equipo.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let email: string | null = null
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    const { data } = await sb.auth.getUser()
    email = data?.user?.email ?? null
  } catch {
    /* sin sesión válida */
  }
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const res = await sendPushToEmails([email], {
    title: '🔔 LCL Control Center',
    body: 'Notificaciones activadas correctamente.',
    url: '/dashboard',
    tag: 'test',
  })
  return NextResponse.json({ ok: true, ...res })
}
