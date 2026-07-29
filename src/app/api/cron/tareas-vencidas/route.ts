import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdmins, sendPushToProfiles } from '@/lib/push'

// GET /api/cron/tareas-vencidas
// Corre cada día a las 7am (Colombia = UTC-5, cron en UTC 12:00)
// Busca tareas cuyo due_date es HOY o ya pasó y no están completadas.
// Push SOLO a sus responsables + un aviso aparte a los admins.
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

  // Co-asignados: una tarea puede tener varios responsables (task_assignees).
  const { data: coasignados } = await admin
    .from('task_assignees')
    .select('task_id, profile_id')
    .in('task_id', tareas.map((t) => t.id))

  const extraPorTarea = new Map<string, string[]>()
  for (const fila of (coasignados ?? []) as { task_id: string; profile_id: string }[]) {
    const lista = extraPorTarea.get(fila.task_id) ?? []
    lista.push(fila.profile_id)
    extraPorTarea.set(fila.task_id, lista)
  }

  const adminIds = (await getAdmins()).map((a) => a.id)
  let totalSent = 0

  for (const tarea of tareas) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perfil = (tarea as any).profiles
    const diasVencida = Math.floor(
      (new Date().getTime() - new Date(tarea.due_date + 'T00:00:00').getTime()) / 86400000
    )
    const label = diasVencida === 0 ? 'vence hoy' : `venció hace ${diasVencida} día${diasVencida > 1 ? 's' : ''}`

    const responsables = [...new Set(
      [tarea.assigned_to, ...(extraPorTarea.get(tarea.id) ?? [])].filter((id): id is string => !!id),
    )]

    // Push a los responsables de ESTA tarea, a nadie más.
    if (responsables.length) {
      const { sent } = await sendPushToProfiles(responsables, {
        title: '⏰ Tarea pendiente',
        body: `"${tarea.title}" — ${label}`,
        url: '/tareas',
        tag: `vencida-${tarea.id}`,
      })
      totalSent += sent
    }

    // Aviso a los admins, sin duplicar a quien ya la recibió como responsable.
    const adminsAvisar = adminIds.filter((id) => !responsables.includes(id))
    if (adminsAvisar.length) {
      const { sent } = await sendPushToProfiles(adminsAvisar, {
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
