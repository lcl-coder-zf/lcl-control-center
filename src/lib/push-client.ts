// Cliente del push. Se llama justo después de notify() y con los MISMOS
// destinatarios, para que la notificación del celular y la de la campana
// coincidan siempre.
import type { SupabaseClient } from '@supabase/supabase-js'

export type PushNotifyOpts = {
  title: string
  body?: string
  url?: string
  /** IDs de perfil que deben recibirla. */
  recipientIds?: (string | null | undefined)[]
  /** Suma a todos los role='admin' (Laura y Daniel reciben TODO). */
  toAdmins?: boolean
  tag?: string
}

/** Best-effort: si el push falla, la noti in-app ya quedó guardada igual. */
export async function pushNotify(supabase: SupabaseClient, opts: PushNotifyOpts): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return
    await fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: opts.title,
        body: opts.body ?? '',
        url: opts.url ?? '/dashboard',
        recipientIds: (opts.recipientIds ?? []).filter(Boolean),
        toAdmins: opts.toAdmins ?? false,
        tag: opts.tag,
      }),
    })
  } catch {
    /* silencioso a propósito */
  }
}
