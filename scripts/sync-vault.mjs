// Sincroniza el "Vault de logins" de LCL Center (tabla usuarios_sistema) con
// los correos y claves ya aplicados en Auth. Lee las claves reales de
// /tmp/lcl-credenciales.txt (así login y Vault coinciden exacto), preserva el
// rol existente y reescribe las 6 filas (borra viejas por email para no dejar
// duplicados con la clave vieja).
//
// Uso (te pide las llaves de Supabase y las pegas):
//   node scripts/sync-vault.mjs --apply
import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { readFileSync } from 'node:fs'

// oldEmail (para leer el rol previo) → { nuevo email, nombre completo }
const MAP = {
  'andrea@lcl.com': { email: 'andrea.berrio@lclgestionempresarial.com', nombre: 'Andrea Berrio' },
  'camila@lcl.com': { email: 'camila.lopez@lclgestionempresarial.com',  nombre: 'Camila Lopez' },
  'daniel@lcl.com': { email: 'daniel.llano@lclgestionempresarial.com',  nombre: 'Daniel Llano' },
  'isabel@lcl.com': { email: 'isabel.llano@lclgestionempresarial.com',  nombre: 'Isabel Llano' },
  'laura@lcl.com':  { email: 'laura.llano@lclgestionempresarial.com',   nombre: 'Laura Llano' },
  'ximena@lcl.com': { email: 'ximena.vega@lclgestionempresarial.com',   nombre: 'Ximena Vega' },
}

const APPLY = process.argv.includes('--apply')

// Claves reales aplicadas en Auth (nombre \t email \t pass).
const creds = {}
try {
  for (const line of readFileSync('/tmp/lcl-credenciales.txt', 'utf8').split('\n')) {
    const [, email, pass] = line.split('\t')
    if (email && pass) creds[email.trim()] = pass.trim()
  }
} catch { console.error('❌ No encontré /tmp/lcl-credenciales.txt (corre antes set-passwords.mjs --apply)'); process.exit(1) }

let url = process.env.NEXT_PUBLIC_SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  const rl = readline.createInterface({ input, output })
  console.log('\nPega las llaves de Supabase (Settings → API):')
  if (!url) url = (await rl.question('  Project URL: ')).trim()
  if (!key) key = (await rl.question('  service_role key: ')).trim()
  rl.close()
}
if (!url || !key) { console.error('❌ Faltan el Project URL o el service_role key'); process.exit(1) }

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// Rol previo por email (viejo o nuevo) para preservarlo.
const { data: existentes } = await admin.from('usuarios_sistema').select('email, rol')
const rolPorEmail = Object.fromEntries((existentes ?? []).map(r => [r.email, r.rol]))

const filas = []
for (const [oldEmail, info] of Object.entries(MAP)) {
  const pass = creds[info.email]
  if (!pass) { console.log(`⚠️  ${info.email} → sin clave en /tmp (salto)`); continue }
  filas.push({
    nombre: info.nombre,
    email: info.email,
    pass,
    rol: rolPorEmail[info.email] ?? rolPorEmail[oldEmail] ?? 'consultant',
  })
}

console.log(`\nModo: ${APPLY ? '🚀 APLICAR' : '🔍 DRY RUN'}\n`)
filas.forEach(f => console.log(`${f.email}  (${f.rol})  →  ${f.pass}`))

if (APPLY && filas.length) {
  const emailsViejos = Object.keys(MAP)
  const emailsNuevos = filas.map(f => f.email)
  await admin.from('usuarios_sistema').delete().in('email', [...emailsViejos, ...emailsNuevos])
  const { error } = await admin.from('usuarios_sistema').insert(filas)
  if (error) { console.error('❌ insert usuarios_sistema:', error.message); process.exit(1) }
  console.log(`\n✅ usuarios_sistema (registro interno): ${filas.length} logins.`)

  // También los agrega al Vault de contraseñas visible en /vault (tabla
  // vault_items), como entradas de categoría 'software'. Idempotente: borra
  // las suyas por nombre antes de reinsertar.
  const vaultRows = filas.map(f => ({
    nombre: `LCL Center (app) — ${f.nombre}`,
    usuario: f.email,
    contrasena: f.pass,
    url: 'https://app.lclgestionempresarial.com',
    notas: 'Login a LCL Control Center',
    categoria: 'software',
  }))
  await admin.from('vault_items').delete().in('nombre', vaultRows.map(r => r.nombre))
  const { error: eV } = await admin.from('vault_items').insert(vaultRows)
  if (eV) console.error('⚠️ vault_items:', eV.message)
  else console.log(`✅ Vault de contraseñas (/vault): ${vaultRows.length} logins agregados.`)
}
console.log(`\n${APPLY ? 'Listo.' : 'Corre con --apply para aplicar.'}\n`)
