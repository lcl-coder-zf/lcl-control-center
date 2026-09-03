// Migración one-time: cifra en reposo los secretos que hoy están en texto plano
// en vault_items.contrasena y usuarios_sistema.pass. Idempotente: salta lo que
// ya está cifrado (prefijo 'enc::'). Usa el MISMO formato que src/lib/vault-crypto.ts.
//
// Uso:
//   VAULT_ENC_KEY=<clave> node scripts/encrypt-vault.mjs           # dry-run
//   VAULT_ENC_KEY=<clave> node scripts/encrypt-vault.mjs --apply   # aplica
// (te pide Project URL + service_role key si no están en el entorno)
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const PREFIX = 'enc::'
const APPLY = process.argv.includes('--apply')

function getKey() {
  const raw = process.env.VAULT_ENC_KEY
  if (!raw) { console.error('❌ Falta VAULT_ENC_KEY en el entorno'); process.exit(1) }
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (buf.length !== 32) { console.error('❌ VAULT_ENC_KEY debe ser 32 bytes (hex de 64 o base64)'); process.exit(1) }
  return buf
}
const KEY = getKey()

const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX)
function encrypt(plain) {
  if (plain == null || plain === '' || isEncrypted(plain)) return plain
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64')
}

let url = process.env.NEXT_PUBLIC_SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  const rl = readline.createInterface({ input, output })
  console.log('\nPega las llaves de Supabase (Settings → API):')
  if (!url) url = (await rl.question('  Project URL: ')).trim()
  if (!key) key = (await rl.question('  service_role key: ')).trim()
  rl.close()
}
if (!url || !key) { console.error('❌ Faltan Project URL o service_role key'); process.exit(1) }

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function migrar(tabla, col) {
  const { data, error } = await admin.from(tabla).select(`id, ${col}`)
  if (error) { console.error(`❌ leyendo ${tabla}:`, error.message); return }
  let porCifrar = 0, yaCifrados = 0
  for (const row of data ?? []) {
    const val = row[col]
    if (!val) continue
    if (isEncrypted(val)) { yaCifrados++; continue }
    porCifrar++
    if (APPLY) {
      const { error: e } = await admin.from(tabla).update({ [col]: encrypt(val) }).eq('id', row.id)
      if (e) console.error(`  ⚠️ ${tabla}#${row.id}:`, e.message)
    }
  }
  console.log(`${tabla}.${col}: ${porCifrar} por cifrar, ${yaCifrados} ya cifrados${APPLY ? ' → aplicado' : ''}`)
}

console.log(`\nModo: ${APPLY ? '🚀 APLICAR' : '🔍 DRY RUN'}\n`)
await migrar('vault_items', 'contrasena')
await migrar('usuarios_sistema', 'pass')
console.log(`\n${APPLY ? '✅ Listo.' : 'Corre con --apply para aplicar.'}\n`)
