import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdmins, sendPushToProfiles } from '@/lib/push'

// GET /api/cron/cronograma-reminder
// Corre cada día lun-vie a las 6am Colombia (UTC 11:00)
// Cada consultora recibe SU agenda del día; los admins reciben un solo resumen
// del equipo, no una copia de la agenda de cada quien.
function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

const primerNombre = (n?: string | null) => (n ?? 'Alguien').trim().split(/\s+/)[0]

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const weekStart = getMonday(now)
  // day_of_week: 0=Lun, 1=Mar ... 4=Vie (getDay() da 1=Lun ... 5=Vie en JS)
  const jsDay = now.getDay() // 1=Lun ... 5=Vie
  const dayOfWeek = jsDay - 1 // 0=Lun ... 4=Vie

  if (dayOfWeek < 0 || dayOfWeek > 4) {
    return NextResponse.json({ ok: true, message: 'Fin de semana, sin recordatorio' })
  }

  const { data: entries } = await admin
    .from('schedule_entries')
    .select('*, profiles(id, full_name, email), companies(name)')
    .eq('week_start', weekStart)
    .eq('day_of_week', dayOfWeek)
    .not('status', 'eq', 'no_aplica')

  if (!entries || entries.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Sin entradas hoy' })
  }

  // Agrupado por persona: un día puede tener varias actividades (medio día en
  // un cliente y medio día en otro), y mandar un push por cada una llenaba el
  // celular de avisos repetidos titulados "Tu agenda de hoy".
  const porPersona = new Map<string, { nombre: string; items: string[] }>()

  for (const entry of entries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perfil = (entry as any).profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empresa = (entry as any).companies
    if (!perfil?.id) continue

    const actividad = empresa?.name ?? entry.activity ?? 'Actividad programada'
    const horario = entry.start_time && entry.end_time
      ? `${entry.start_time.slice(0, 5)}–${entry.end_time.slice(0, 5)}`
      : entry.session === 'medio_manana' ? 'media jornada AM'
      : entry.session === 'medio_tarde' ? 'media jornada PM'
      : 'todo el día'

    const acc = porPersona.get(perfil.id) ?? { nombre: primerNombre(perfil.full_name), items: [] }
    acc.items.push(`${actividad} (${horario})`)
    porPersona.set(perfil.id, acc)
  }

  let totalSent = 0
  const resumen: string[] = []

  for (const [profileId, { nombre, items }] of porPersona) {
    // Solo a la dueña de la agenda, con todo su día en un mismo aviso.
    const { sent } = await sendPushToProfiles([profileId], {
      title: '📅 Tu agenda de hoy',
      body: items.join(' · '),
      url: '/cronograma',
      tag: `cronograma-${weekStart}-${dayOfWeek}`,
    })
    totalSent += sent
    resumen.push(`${nombre}: ${items.join(', ')}`)
  }

  // Un único resumen del día para los admins.
  const adminIds = (await getAdmins()).map((a) => a.id)
  if (adminIds.length && resumen.length) {
    const { sent } = await sendPushToProfiles(adminIds, {
      title: '📅 Agenda del equipo hoy',
      body: resumen.join(' · '),
      url: '/cronograma',
      tag: `cronograma-resumen-${weekStart}-${dayOfWeek}`,
    })
    totalSent += sent
  }

  return NextResponse.json({ ok: true, entries: entries.length, sent: totalSent })
}
