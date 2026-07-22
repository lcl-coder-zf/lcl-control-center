import { NextRequest, NextResponse } from 'next/server'
import { sendPush } from '@/lib/push'

// POST /api/push/notify  { title, body, url?, topic? }
// Llamado desde componentes cliente después de crear notificaciones in-app.
export async function POST(req: NextRequest) {
  const { title, body, url, topic } = await req.json().catch(() => ({}))
  if (!title) return NextResponse.json({ error: 'title requerido' }, { status: 400 })

  const res = await sendPush(topic ?? 'general', {
    title,
    body: body ?? '',
    url: url ?? '/dashboard',
    tag: topic ?? 'general',
  })
  return NextResponse.json({ ok: true, ...res })
}
