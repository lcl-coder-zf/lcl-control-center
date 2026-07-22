import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush } from '@/lib/push'

// GET /api/cron/tareas-vencidas
// Corre cada día a las 7am (Colombia = UTC-5, cron en UTC 12:00)
// Busca tareas cuyo due_date es HOY o ya pasó y no están completadas.
// Push al responsable + admins por cada tarea vencida.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Tareas que vencen HOY y no están completadas
  const { data: tareas } = await admin
    .from('tasks')
    .select('id, title, due_date, assigned_to, profiles!tasks_assigned_to_fkey(id, full_name, email)')
    .lte('due_date', today)
    .not('status', 'in', '("completada","cancelada")')
    .eq('recurrence_active', false)

  if (!tareas || tareas.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Sin tareas vencidas hoy' })
  }

  // Emails de admins para push por email
  const { data: admins } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'admin')
  const adminEmails = (admins ?? []).map((a: { email: string }) => a.email)

  let totalSent = 0

  for (const tarea of tareas) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perfil = (tarea as any).profiles
    const diasVencida = Math.floor(
      (new Date().getTime() - new Date(tarea.due_date + 'T00:00:00').getTime()) / 86400000
    )
    const label = diasVencida === 0 ? 'vence hoy' : `venció hace ${diasVencida} día${diasVencida > 1 ? 's' : ''}`

    // Push al responsable (por su email, suscripción personal)
    if (perfil?.email) {
      const { sent } = await sendPush('general', {
        title: '⏰ Tarea pendiente',
        body: `"${tarea.title}" — ${label}`,
        url: '/tareas',
        tag: `vencida-${tarea.id}`,
      })
      totalSent += sent
    }

    // Push a admins (topic admin) avisando del responsable
    if (adminEmails.length > 0) {
      const { sent } = await sendPush('admin', {
        title: '⚠️ Tarea vencida',
        body: `"${tarea.title}" de ${perfil?.full_name ?? 'un consultor'} — ${label}`,
        url: '/tareas',
        tag: `vencida-admin-${tarea.id}`,
      })
      totalSent += sent
    }
  }

  return NextResponse.json({ ok: true, tareas: tareas.length, sent: totalSent })
}
