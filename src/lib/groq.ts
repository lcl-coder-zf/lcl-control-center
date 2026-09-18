// ============================================================
// Groq — transcripción (Whisper) + generación de acta (Llama).
// Una sola API key (GROQ_API_KEY) cubre las dos cosas.
// Barato: Whisper large-v3-turbo cuesta centavos por hora de audio.
// ============================================================

const GROQ_URL = 'https://api.groq.com/openai/v1'

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

export interface ActaGenerada {
  summary: string
  acta: string
  actionItems: { title: string; assignee?: string }[]
}

// Groq rota sus modelos y cada uno tiene su PROPIO tope de tokens/minuto (TPM)
// en el tier gratis. Una transcripción de reunión larga (~10k tokens) revienta
// los modelos de 8k TPM. La lista va ordenada dando prioridad a los de más TPM
// (más "aire" para transcripciones largas) sin perder calidad; luego se prueban
// en CASCADA: si uno responde 429/413, se salta al siguiente (presupuesto propio).
const ACTA_MODEL_PRIORITY = [
  'llama-3.3-70b-versatile',                      // ~12k TPM, mejor calidad
  'meta-llama/llama-4-scout-17b-16e-instruct',    // ~30k TPM, mucho aire
  'moonshotai/kimi-k2-instruct',                  // ~10k TPM
  'openai/gpt-oss-120b',                          // ~8k TPM
  'openai/gpt-oss-20b',                           // ~8k TPM
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
]

let cachedModels: string[] | null = null

// Devuelve los modelos de la lista de preferencia que existen en esta cuenta,
// en orden. Si no se puede consultar, cae a la lista completa.
async function actaModels(): Promise<string[]> {
  if (cachedModels) return cachedModels
  try {
    const res = await fetch(`${GROQ_URL}/models`, { headers: { Authorization: `Bearer ${groqKey()}` } })
    if (res.ok) {
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids: string[] = (data?.data ?? []).map((m: any) => m.id as string)
      const disponibles = ACTA_MODEL_PRIORITY.filter(m => ids.includes(m))
      // Si ninguno de la lista está, usar cualquier modelo de texto de la cuenta.
      const otros = ids.filter(id => !/whisper|tts|guard|embed|prompt-guard/i.test(id))
      cachedModels = disponibles.length ? disponibles : otros
      if (cachedModels.length) return cachedModels
    }
  } catch { /* cae al fallback */ }
  return ACTA_MODEL_PRIORITY
}

// Toma la transcripción y arma resumen + acta (markdown) + tareas de seguimiento.
// Prueba los modelos en cascada: si uno se queda sin cupo de tokens/minuto
// (429) o rechaza por tamaño (413), pasa al siguiente en vez de fallar.
export async function generateActa(
  transcript: string,
  ctx: { title: string; date: string; attendees?: string[] },
): Promise<ActaGenerada> {
  const asistentes = ctx.attendees?.length ? ctx.attendees.join(', ') : 'no especificados'
  const sys = `Eres un asistente que redacta actas de reunión profesionales en español (Colombia).
Devuelves SOLO un JSON válido, sin texto extra, con esta forma exacta:
{
  "summary": "resumen de 2-3 frases",
  "acta": "acta en markdown con secciones: ## Temas tratados, ## Decisiones, ## Compromisos",
  "actionItems": [{ "title": "tarea concreta y accionable", "assignee": "nombre si se mencionó, si no omitir" }]
}
Sé fiel a lo que se dijo, no inventes. Las tareas deben ser accionables y cortas.`
  const user = `Reunión: ${ctx.title}
Fecha: ${ctx.date}
Asistentes: ${asistentes}

Transcripción:
"""
${transcript}
"""`

  const modelos = await actaModels()
  let ultimoError = 'sin modelos disponibles'
  for (const model of modelos) {
    const res = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content ?? '{}'
      let parsed: ActaGenerada
      try {
        parsed = JSON.parse(content)
      } catch {
        parsed = { summary: '', acta: content, actionItems: [] }
      }
      return {
        summary: parsed.summary ?? '',
        acta: parsed.acta ?? '',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      }
    }

    // 429 (sin cupo de tokens/minuto) o 413 (muy grande) → probar el siguiente
    // modelo, que tiene su propio presupuesto. Otros errores: cortar.
    ultimoError = `${res.status} ${await res.text()}`
    if (res.status !== 429 && res.status !== 413) break
  }
  throw new Error(`Groq acta falló: ${ultimoError}`)
}
