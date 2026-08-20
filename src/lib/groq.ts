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

// Transcribe un audio (desde su URL pública) usando Whisper en Groq.
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error('No se pudo descargar el audio')
  const blob = await audioRes.blob()

  const form = new FormData()
  form.append('file', blob, 'reunion.webm')
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

export interface ActaGenerada {
  summary: string
  acta: string
  actionItems: { title: string; assignee?: string }[]
}

// Groq rota sus modelos seguido y no todos están en toda cuenta. En vez de
// hardcodear uno (que puede dar 404), preguntamos qué modelos hay y elegimos
// el mejor disponible de esta lista de preferencia.
const ACTA_MODEL_PRIORITY = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'moonshotai/kimi-k2-instruct',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
]

let cachedActaModel: string | null = null

async function pickActaModel(): Promise<string> {
  if (cachedActaModel) return cachedActaModel
  try {
    const res = await fetch(`${GROQ_URL}/models`, { headers: { Authorization: `Bearer ${groqKey()}` } })
    if (res.ok) {
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids: string[] = (data?.data ?? []).map((m: any) => m.id as string)
      const esTexto = (id: string) => !/whisper|tts|guard|embed|prompt-guard/i.test(id)
      const elegido = ACTA_MODEL_PRIORITY.find(m => ids.includes(m)) ?? ids.find(esTexto)
      if (elegido) { cachedActaModel = elegido; return elegido }
    }
  } catch { /* cae al fallback */ }
  return ACTA_MODEL_PRIORITY[0]
}

// Toma la transcripción y arma resumen + acta (markdown) + tareas de seguimiento.
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

  const res = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: await pickActaModel(),
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Groq acta falló: ${res.status} ${await res.text()}`)
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
