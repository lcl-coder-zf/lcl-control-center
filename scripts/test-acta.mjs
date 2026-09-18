// Prueba REAL de generación de acta con Anthropic, sin tocar la app.
// Uso:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/test-acta.mjs [ruta-transcripcion.txt]
// Si no se pasa archivo, usa una transcripción de ejemplo.
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'

const MODEL = process.env.ANTHROPIC_ACTA_MODEL || 'claude-haiku-4-5'

const EJEMPLO = `Andrea: Buenos días a todas, arranquemos con la reunión interna de LCL.
Camila: Listo. Primer punto, el cliente Diaqua pidió adelantar la entrega del informe de cumplimiento para el viernes.
Isabel: Podemos, pero necesito que Ximena me pase los soportes de SAGRILAFT antes del miércoles.
Ximena: Dale, yo los subo el martes al Drive.
Andrea: Segundo punto, la vacante de analista junior ya tiene 11 hojas de vida. Camila las preselecciona esta semana.
Camila: Sí, quedo de mandar las 5 mejores el jueves.
Isabel: Y hay que decidir si renovamos el Google Workspace, vence el primero de septiembre.
Andrea: Decidido, lo renovamos. Isabel lo gestiona.
Andrea: Sin más puntos, cerramos.`

const transcript = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : EJEMPLO

const sys = `Eres un asistente que redacta actas de reunión profesionales en español (Colombia).
Devuelves SOLO un JSON válido, sin texto extra, con esta forma exacta:
{
  "summary": "resumen de 2-3 frases",
  "acta": "acta en markdown con secciones: ## Temas tratados, ## Decisiones, ## Compromisos",
  "actionItems": [{ "title": "tarea concreta y accionable", "assignee": "nombre si se mencionó, si no omitir" }]
}
Sé fiel a lo que se dijo, no inventes. Las tareas deben ser accionables y cortas.`

const user = `Reunión: Reunión interna LCL
Fecha: 2026-09-10
Asistentes: Andrea Berrio, Camila Lopez, Isabel Llano, Ximena Vega

Transcripción:
"""
${transcript}
"""`

const client = new Anthropic()
console.log(`→ Modelo: ${MODEL} · transcripción: ${transcript.length.toLocaleString()} caracteres\n`)
const t0 = Date.now()
const res = await client.messages.create({
  model: MODEL,
  max_tokens: 4096,
  system: sys,
  messages: [{ role: 'user', content: user }],
})
const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('')

let raw = text.trim()
const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
if (fence) raw = fence[1].trim()
const a = raw.indexOf('{'), b = raw.lastIndexOf('}')
if (a !== -1 && b > a) raw = raw.slice(a, b + 1)
const acta = JSON.parse(raw)

console.log('=== RESUMEN ===\n' + acta.summary + '\n')
console.log('=== ACTA ===\n' + acta.acta + '\n')
console.log('=== TAREAS ===')
for (const it of acta.actionItems || []) console.log(` - ${it.title}${it.assignee ? ` (${it.assignee})` : ''}`)
console.log(`\n✓ OK en ${((Date.now() - t0) / 1000).toFixed(1)}s · tokens in/out: ${res.usage.input_tokens}/${res.usage.output_tokens}`)
