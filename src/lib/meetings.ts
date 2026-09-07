import { createClient } from '@/lib/supabase/client'

type SB = ReturnType<typeof createClient>

// Elimina una reunión: primero borra el audio del bucket (si tiene) y luego la
// fila. Los asistentes se van solos por el FK on delete cascade; las tareas
// ligadas quedan (meeting_id on delete set null). El DELETE solo lo permite la
// RLS a role='admin' (ver supabase/meetings_delete_admin_migration.sql), así
// que si un consultor llegara a llamar esto, Supabase lo rechaza.
export async function deleteMeeting(
  supabase: SB,
  meeting: { id: string; audio_path?: string | null },
): Promise<void> {
  if (meeting.audio_path) {
    // Si el borrado del audio falla no bloqueamos el de la reunión.
    try { await supabase.storage.from('reuniones').remove([meeting.audio_path]) } catch { /* noop */ }
  }
  const { error } = await supabase.from('meetings').delete().eq('id', meeting.id)
  if (error) throw error
}
