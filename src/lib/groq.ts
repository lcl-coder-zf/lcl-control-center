// ============================================================
// Groq — transcripción (Whisper). La generación del acta vive en acta.ts
// (usa Anthropic por defecto; Groq como respaldo).
// Barato: Whisper large-v3-turbo cuesta centavos por hora de audio.
// ============================================================

export const GROQ_URL = 'https://api.groq.com/openai/v1'

export function groqKey(): string {
  const k = process.env.GROQ_API_KEY
  if (!k) throw new Error('GROQ_API_KEY no configurado')
  return k
}

// Transcribe un blob de audio ya en memoria (un trozo) usando Whisper en Groq.
// El troceo + downsample a mono 16 kHz se hace en el cliente (ver
// src/lib/audio-chunk.ts) para no chocar con el tope de tamaño de Groq (413).
export async function transcribeBlob(blob: Blob, filename = 'chunk.wav'): Promise<string> {
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('language', 'es')
  form.append('response_format', 'text')

  const res = await fetch(`${GROQ_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey()}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Groq transcripción falló: ${res.status} ${await res.text()}`)
  return (await res.text()).trim()
}

// Transcribe un audio completo desde su URL pública (camino legado / fallback
// para reuniones viejas o audios ya pequeños). Los audios grandes se trocean en
// el cliente y llegan por transcribeBlob.
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error('No se pudo descargar el audio')
  return transcribeBlob(await audioRes.blob(), 'reunion.webm')
}

