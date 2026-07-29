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

export type PushResult = { sent: number; removed: number }

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string }

const VACIO: PushResult = { sent: 0, removed: 0 }
const norm = (email: string) => email.trim().toLowerCase()

// Entrega efectiva + limpieza de endpoints muertos.
async function deliver(subs: SubRow[], payload: PushPayload): Promise<PushResult> {
  if (!subs.length) return VACIO
  const body = JSON.stringify({ url: '/dashboard', ...payload })
  let sent = 0
  const toRemove: string[] = []

  await Promise.all(
    subs.map(async (s) => {
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
    await (createAdminClient().from('push_subscriptions') as any).delete().in('id', toRemove)
  }
  return { sent, removed: toRemove.length }
}

/**
 * Envía SOLO a los dispositivos de estos correos.
 * Es la base del enrutamiento por persona: cada quien recibe lo suyo.
 */
export async function sendPushToEmails(
  emails: (string | null | undefined)[],
  payload: PushPayload,
): Promise<PushResult> {
  if (!ensureConfigured()) return VACIO
  const lista = [...new Set(emails.filter((e): e is string => !!e).map(norm))]
  if (!lista.length) return VACIO

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('push_subscriptions') as any)
    .select('id, endpoint, p256dh, auth')
    .in('user_email', lista)

  return deliver((data ?? []) as SubRow[], payload)
}

/**
 * Igual que sendPushToEmails pero recibiendo IDs de perfil, para que el push
 * use exactamente los mismos destinatarios que `notify()` de la noti in-app.
 */
export async function sendPushToProfiles(
  profileIds: (string | null | undefined)[],
  payload: PushPayload,
): Promise<PushResult> {
  const ids = [...new Set(profileIds.filter((id): id is string => !!id))]
  if (!ids.length) return VACIO

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('profiles') as any).select('email').in('id', ids)
  return sendPushToEmails(((data ?? []) as { email: string }[]).map((p) => p.email), payload)
}

/** Perfiles con role='admin' — reciben notificación de TODO (regla LCL). */
export async function getAdmins(): Promise<{ id: string; email: string }[]> {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('profiles') as any).select('id, email').eq('role', 'admin')
  return (data ?? []) as { id: string; email: string }[]
}

export async function getAdminEmails(): Promise<string[]> {
  return (await getAdmins()).map((a) => a.email).filter(Boolean)
}

/**
 * Broadcast por topic — llega a TODO el que esté suscrito a ese topic.
 * Reservado para avisos dirigidos a todo el equipo. Para cualquier cosa
 * dirigida a una persona usa sendPushToProfiles / sendPushToEmails.
 */
export async function sendPush(topic: string, payload: PushPayload): Promise<PushResult> {
  if (!ensureConfigured()) return VACIO
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('push_subscriptions') as any)
    .select('id, endpoint, p256dh, auth')
    .contains('topics', [topic])

  return deliver((data ?? []) as SubRow[], payload)
}
