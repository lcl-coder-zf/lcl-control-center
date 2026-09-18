// ============================================================
// Generación del acta a partir de la transcripción.
//
// Groq (tier gratis) topa en ~8k tokens/minuto por modelo, y la transcripción
// de una reunión de ~50 min son ~10k tokens → NO cabe en una sola llamada, por
// eso el acta se genera con la API de Anthropic (Claude), que no tiene ese tope.
// Si no hay ANTHROPIC_API_KEY, cae al camino viejo de Groq (sirve para reuniones
// cortas).
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import { GROQ_URL, groqKey } from '@/lib/groq'

export interface ActaGenerada {
  summary: string
  acta: string
  actionItems: { title: string; assignee?: string }[]
}

// Modelo de Anthropic para el acta. Haiku 4.5 es barato, rápido y de sobra para
// redactar un acta desde la transcripción; se puede subir a Opus con la env.
const ANTHROPIC_ACTA_MODEL = process.env.ANTHROPIC_ACTA_MODEL || 'claude-haiku-4-5'

// Prompt compartido por ambos proveedores.
function buildPrompts(transcript: string, ctx: { title: string; date: string; attendees?: string[] }) {
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
  return { sys, user }
}

// Extrae el objeto JSON de la respuesta (Claude a veces lo envuelve en ```json).
function parseActa(raw: string): ActaGenerada {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  // Si aún hay texto alrededor, quedarse con el primer objeto {...}.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1)
  let parsed: Partial<ActaGenerada> = {}
  try { parsed = JSON.parse(text) } catch { parsed = { summary: '', acta: raw, actionItems: [] } }
  return {
    summary: parsed.summary ?? '',
    acta: parsed.acta ?? '',
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
  }
}

// ── Anthropic (camino principal) ───────────────────────────
async function generateActaAnthropic(
  transcript: string,
  ctx: { title: string; date: string; attendees?: string[] },
): Promise<ActaGenerada> {
  const client = new Anthropic()  // lee ANTHROPIC_API_KEY del entorno
  const { sys, user } = buildPrompts(transcript, ctx)
  const res = await client.messages.create({
    model: ANTHROPIC_ACTA_MODEL,
    max_tokens: 4096,
    system: sys,
    messages: [{ role: 'user', content: user }],
  })
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  return parseActa(text)
}

// ── Groq (respaldo para reuniones cortas si no hay key de Anthropic) ──
const GROQ_MODEL_PRIORITY = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'moonshotai/kimi-k2-instruct',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'qwen/qwen3-32b',
  'llama-3.1-8b-instant',
]
let cachedGroqModels: string[] | null = null
async function groqModels(): Promise<string[]> {
  if (cachedGroqModels) return cachedGroqModels
  try {
    const res = await fetch(`${GROQ_URL}/models`, { headers: { Authorization: `Bearer ${groqKey()}` } })
    if (res.ok) {
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids: string[] = (data?.data ?? []).map((m: any) => m.id as string)
      const disponibles = GROQ_MODEL_PRIORITY.filter(m => ids.includes(m))
      const otros = ids.filter(id => !/whisper|tts|guard|embed|prompt-guard/i.test(id))
      cachedGroqModels = disponibles.length ? disponibles : otros
      if (cachedGroqModels.length) return cachedGroqModels
    }
  } catch { /* cae al fallback */ }
  return GROQ_MODEL_PRIORITY
}

async function generateActaGroq(
  transcript: string,
  ctx: { title: string; date: string; attendees?: string[] },
): Promise<ActaGenerada> {
  const { sys, user } = buildPrompts(transcript, ctx)
  const modelos = await groqModels()
  let ultimoError = 'sin modelos disponibles'
  for (const model of modelos) {
    const res = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      return parseActa(data.choices?.[0]?.message?.content ?? '{}')
    }
    ultimoError = `${res.status} ${await res.text()}`
    if (res.status !== 429 && res.status !== 413) break
  }
  throw new Error(`Groq acta falló: ${ultimoError}`)
}

// Dispatcher: Anthropic si hay key, si no Groq (reuniones cortas).
export async function generateActa(
  transcript: string,
  ctx: { title: string; date: string; attendees?: string[] },
): Promise<ActaGenerada> {
  if (process.env.ANTHROPIC_API_KEY) return generateActaAnthropic(transcript, ctx)
  return generateActaGroq(transcript, ctx)
}
