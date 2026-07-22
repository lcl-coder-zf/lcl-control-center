import { NextResponse } from 'next/server'
import { sendPush } from '@/lib/push'

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const topic = searchParams.get('topic') ?? 'general'
  const res = await sendPush(topic, {
    title: '🔔 LCL Control Center',
    body: 'Notificaciones activadas correctamente.',
    url: '/dashboard',
    tag: 'test',
  })
  return NextResponse.json({ ok: true, ...res })
}
