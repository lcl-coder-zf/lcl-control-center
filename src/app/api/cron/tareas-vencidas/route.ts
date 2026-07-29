import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdmins, sendPushToProfiles } from '@/lib/push'

// GET /api/cron/tareas-vencidas
// Corre cada día a las 7am (Colombia = UTC-5, cron en UTC 12:00)
// Dos cosas:
//   1. Tareas cuyo due_date es HOY o ya pasó y no están completadas.
//   2. Fechas clave: tareas con `aviso_dias_antes`, avisadas con esa
//      anticipación — la documentación de algunas obligaciones se empieza a
//      pedir semanas antes de la fecha, así que avisar el mismo día no sirve.
// En ambos casos el push va SOLO a sus responsables + aviso a los admins.

type Row = Record<string, unknown>

const SELECT_TAREA =
  'id, title, due_date, assigned_to, aviso_dias_antes, status, ' +
  'profiles!tasks_assigned_to_fkey(id, full_name), task_companies(companies(name))'

const diasHasta = (dueDate: string): number =>
  Math.floor((new Date(dueDate + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientesDe = (t: any): string =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((t?.task_companies ?? []).map((c: any) => c.companies?.name).filter(Boolean) as string[]).join(' · ')

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Los embeds nuevos no están en los tipos generados de Supabase; el repo ya
  // usa este casteo en el resto de consultas con service_role.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasksQuery = () => (admin.from('tasks') as any).select(SELECT_TAREA)

  const [{ data: vencidas }, { data: proximas }] = await Promise.all([
    // 1. Vencidas o que vencen hoy
    tasksQuery()
      .lte('due_date', today)
      .not('status', 'in', '("completada","cancelada")')
      .eq('recurrence_active', false),
    // 2. Con aviso anticipado configurado (fechas clave)
    tasksQuery()
      .gt('due_date', today)
      .not('aviso_dias_antes', 'is', null)
      .not('status', 'in', '("completada","cancelada")'),
  ])

  // Solo las que caen justo hoy según su anticipación (aviso una sola vez).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avisar = (proximas ?? []).filter((t: any) =>
    Number(t.aviso_dias_antes) > 0 && diasHasta(t.due_date) === Number(t.aviso_dias_antes)
  )

  const tareas = [...(vencidas ?? []), ...avisar] as Row[]
  if (tareas.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Sin tareas que avisar hoy' })
  }

  // Co-asignados: una tarea puede tener varios responsables (task_assignees).
  const { data: coasignados } = await admin
    .from('task_assignees')
    .select('task_id, profile_id')
    .in('task_id', tareas.map(t => t.id as string))

  const extraPorTarea = new Map<string, string[]>()
  for (const fila of (coasignados ?? []) as { task_id: string; profile_id: string }[]) {
    const lista = extraPorTarea.get(fila.task_id) ?? []
    lista.push(fila.profile_id)
    extraPorTarea.set(fila.task_id, lista)
  }

  // La RLS esconde de los consultores las tareas de quien tenga oculta_tareas.
  // El cron corre con service_role y se la salta, así que hay que respetarla
  // a mano: de esas tareas solo se avisa al dueño y a los admins.
  const { data: ocultos } = await admin.from('profiles').select('id').eq('oculta_tareas', true)
  const conTareasOcultas = new Set((ocultos ?? []).map((p: { id: string }) => p.id))

  const adminIds = (await getAdmins()).map(a => a.id)
  let totalSent = 0

  for (const tarea of tareas) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = tarea as any
    const dias = diasHasta(t.due_date)
    const clientes = clientesDe(t)
    const sufijoCliente = clientes ? ` · ${clientes}` : ''

    const esAviso = dias > 0
    const label = esAviso
      ? `faltan ${dias} día${dias > 1 ? 's' : ''}`
      : dias === 0
        ? 'vence hoy'
        : `venció hace ${Math.abs(dias)} día${Math.abs(dias) > 1 ? 's' : ''}`

    const responsablesTodos = [...new Set(
      [t.assigned_to, ...(extraPorTarea.get(t.id) ?? [])].filter((id): id is string => !!id),
    )]

    // Si la tarea es de alguien con oculta_tareas, los consultores co-asignados
    // no deben ver ni el título por notificación.
    const responsables = conTareasOcultas.has(t.assigned_to)
      ? responsablesTodos.filter(id => id === t.assigned_to || adminIds.includes(id))
      : responsablesTodos

    if (responsables.length) {
      const { sent } = await sendPushToProfiles(responsables, {
        title: esAviso ? '🗓️ Se acerca una fecha clave' : '⏰ Tarea pendiente',
        body: `"${t.title}"${sufijoCliente} — ${label}`,
        url: '/tareas',
        tag: `${esAviso ? 'aviso' : 'vencida'}-${t.id}`,
      })
      totalSent += sent
    }

    // Aviso a los admins, sin duplicar a quien ya la recibió como responsable.
    const adminsAvisar = adminIds.filter(id => !responsables.includes(id))
    if (adminsAvisar.length) {
      const { sent } = await sendPushToProfiles(adminsAvisar, {
        title: esAviso ? '🗓️ Fecha clave próxima' : '⚠️ Tarea vencida',
        body: `"${t.title}"${sufijoCliente} de ${t.profiles?.full_name ?? 'un consultor'} — ${label}`,
        url: '/tareas',
        tag: `${esAviso ? 'aviso' : 'vencida'}-admin-${t.id}`,
      })
      totalSent += sent
    }
  }

  return NextResponse.json({
    ok: true,
    vencidas: vencidas?.length ?? 0,
    avisos: avisar.length,
    sent: totalSent,
  })
}
