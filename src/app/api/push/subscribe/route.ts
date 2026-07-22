import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const sub = body?.subscription
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  let email: string | null = null
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const sb  = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data } = await sb.auth.getUser()
      email = data?.user?.email ?? null
    } catch { /* sin sesión, sigue */ }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('push_subscriptions') as any).upsert(
    {
      endpoint:     sub.endpoint,
      p256dh:       sub.keys.p256dh,
      auth:         sub.keys.auth,
      user_email:   email,
      label:        body.label ?? null,
      topics:       Array.isArray(body.topics) && body.topics.length ? body.topics : ['general'],
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
