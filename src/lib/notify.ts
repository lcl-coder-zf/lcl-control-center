// Notificaciones in-app. Inserta filas en `notifications` para los destinatarios.
// Regla LCL: Laura y Daniel (admins) reciben notificación de TODO.
import type { SupabaseClient } from '@supabase/supabase-js'

// IDs de los super admin (Laura y Daniel) — reciben notis de todo.
export async function adminIds(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('profiles').select('id').eq('role', 'admin')
  return (data ?? []).map(p => p.id)
}

// Crea notificaciones para los destinatarios (deduplicadas, sin notificar al actor).
export async function notify(
  supabase: SupabaseClient,
  opts: { recipientIds: (string | null | undefined)[]; type: string; message: string; link?: string; actorId?: string },
) {
  const ids = [...new Set(opts.recipientIds)].filter((id): id is string => !!id && id !== opts.actorId)
  if (ids.length === 0) return
  await supabase.from('notifications').insert(
    ids.map(user_id => ({ user_id, type: opts.type, message: opts.message, link: opts.link ?? null })),
  )
}
