import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush } from '@/lib/push'

// GET /api/cron/cronograma-reminder
// Corre cada día lun-vie a las 6am Colombia (UTC 11:00)
// Busca las entradas del cronograma de hoy y envía push a cada consultor.
function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

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

  let totalSent = 0
  for (const entry of entries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perfil = (entry as any).profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empresa = (entry as any).companies
    if (!perfil?.email) continue

    const actividad = empresa?.name ?? entry.activity ?? 'Actividad programada'
    const horario = entry.start_time && entry.end_time
      ? `${entry.start_time.slice(0, 5)} – ${entry.end_time.slice(0, 5)}`
      : entry.session === 'medio_manana' ? 'Mañana'
      : entry.session === 'medio_tarde' ? 'Tarde'
      : 'Todo el día'

    const { sent } = await sendPush('general', {
      title: `📅 Tu agenda de hoy`,
      body: `${actividad} · ${horario}`,
      url: '/cronograma',
      tag: `cronograma-${entry.id}`,
    })
    totalSent += sent
  }

  return NextResponse.json({ ok: true, entries: entries.length, sent: totalSent })
}
