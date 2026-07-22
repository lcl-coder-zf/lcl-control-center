import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject    = process.env.VAPID_SUBJECT || 'mailto:daniel@lcl.com'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string }

export async function sendPush(topic: string, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 }
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tema, adminSubs] = await Promise.all([
    (admin.from('push_subscriptions') as any).select('id, endpoint, p256dh, auth').contains('topics', [topic]),
    topic === 'admin'
      ? Promise.resolve({ data: [] as SubRow[] })
      : (admin.from('push_subscriptions') as any).select('id, endpoint, p256dh, auth').contains('topics', ['admin']),
  ])

  const byId = new Map<string, SubRow>()
  for (const s of ((tema.data ?? []) as SubRow[])) byId.set(s.id, s)
  for (const s of ((adminSubs.data ?? []) as SubRow[])) byId.set(s.id, s)
  const data = [...byId.values()]
  if (!data.length) return { sent: 0, removed: 0 }

  const body = JSON.stringify({ url: '/dashboard', ...payload })
  let sent = 0
  const toRemove: string[] = []

  await Promise.all(
    data.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        )
        sent++
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode
        if (code === 404 || code === 410) toRemove.push(s.id)
      }
    }),
  )

  if (toRemove.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('push_subscriptions') as any).delete().in('id', toRemove)
  }
  return { sent, removed: toRemove.length }
}
