import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/admin-guard'
import { transcribeBlob } from '@/lib/groq'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST multipart { file } → transcribe UN trozo de audio con Whisper (Groq).
// El cliente trocea la reunión en segmentos mono 16 kHz (src/lib/audio-chunk.ts)
// y llama esta ruta por cada trozo, así ningún request pega en el tope de Groq
// y cada llamada cabe de sobra en los 60 s de la función.
export async function POST(req: NextRequest) {
  // Usa la API key de Groq (cuota): exigir sesión de cualquier miembro del equipo.
  const user = await requireUser(req)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Falta el archivo de audio' }, { status: 400 })
  }
  // Tope defensivo: un trozo bien formado ronda los 15 MB.
  if (file.size > 30 * 1024 * 1024) {
    return NextResponse.json({ error: 'El trozo de audio es demasiado grande' }, { status: 413 })
  }

  try {
    const text = await transcribeBlob(file)
    return NextResponse.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error transcribiendo el audio'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
