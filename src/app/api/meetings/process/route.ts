import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transcribeAudio, generateActa } from '@/lib/groq'

export const runtime = 'nodejs'
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

// POST { meetingId } → transcribe el audio y genera el acta con Groq.
export async function POST(req: NextRequest) {
  const { meetingId } = (await req.json().catch(() => ({}))) as { meetingId?: string }
  if (!meetingId) return NextResponse.json({ error: 'meetingId requerido' }, { status: 400 })

  const admin = createAdminClient() as AnyClient
  const { data: meeting, error } = await admin
    .from('meetings')
    .select('*, meeting_attendees(profiles(full_name))')
    .eq('id', meetingId)
    .single()
  if (error || !meeting) return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 })
  if (!meeting.audio_url) return NextResponse.json({ error: 'La reunión no tiene audio' }, { status: 400 })

  await admin.from('meetings').update({ status: 'procesando' }).eq('id', meetingId)

  try {
    // Si ya hay transcript (p.ej. el acta falló antes), no re-transcribir:
    // ahorra la cuota de audio de Groq y solo regenera el acta.
    let transcript: string = meeting.transcript ?? ''
    if (!transcript.trim()) {
      transcript = await transcribeAudio(meeting.audio_url)
      // Guardar el transcript de una: si el acta falla después, no se pierde.
      await admin.from('meetings').update({ transcript }).eq('id', meetingId)
    }

    const attendees: string[] = (meeting.meeting_attendees ?? [])
      .map((a: AnyClient) => a.profiles?.full_name)
      .filter(Boolean)
    const acta = await generateActa(transcript, {
      title: meeting.title,
      date: meeting.meeting_date,
      attendees,
    })

    await admin.from('meetings').update({
      summary: acta.summary,
      acta: acta.acta,
      suggested_tasks: acta.actionItems ?? [],
      status: 'listo',
    }).eq('id', meetingId)

    return NextResponse.json({ ok: true, transcript, ...acta })
  } catch (err) {
    // Si ya hay transcript guardado, dejar la reunión utilizable (acta a mano).
    const { data: m } = await admin.from('meetings').select('transcript').eq('id', meetingId).single()
    await admin.from('meetings').update({ status: m?.transcript ? 'listo' : 'error' }).eq('id', meetingId)
    const msg = err instanceof Error ? err.message : 'Error procesando la reunión'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
