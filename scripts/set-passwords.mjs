// Rota las contraseñas de los usuarios de LCL a una clave individual por
// persona (esquema: NombreLCL + símbolos — ej. AndreaLCL+*, CamilaLCL+-+).
// Reemplaza la compartida Lcl2026!. El UID no se toca.
//
// Uso (te pide las llaves de Supabase → Settings → API y las pegas):
//   node scripts/set-passwords.mjs          (muestra a quién le cambia, sin cambiar)
//   node scripts/set-passwords.mjs --apply   (genera, aplica e imprime la tabla)
import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { writeFileSync } from 'node:fs'

// Combos de símbolos (estilo AndreaLCL+*, CamilaLCL+-+). Se reparte uno
// distinto a cada persona para que las claves no queden iguales.
const SUFIJOS = ['+*', '+-+', '*-*', '+*+', '-+-', '#*#', '*+*', '+#+', '-*-', '#-#']
const barajado = [...SUFIJOS].sort(() => Math.random() - 0.5)

// Nombre visible (para la clave) por correo corporativo.
const USERS = [
  { nombre: 'Andrea', email: 'andrea.berrio@lclgestionempresarial.com' },
  { nombre: 'Camila', email: 'camila.lopez@lclgestionempresarial.com' },
  { nombre: 'Daniel', email: 'daniel.llano@lclgestionempresarial.com' },
  { nombre: 'Isabel', email: 'isabel.llano@lclgestionempresarial.com' },
  { nombre: 'Laura',  email: 'laura.llano@lclgestionempresarial.com' },
  { nombre: 'Ximena', email: 'ximena.vega@lclgestionempresarial.com' },
]

// Clave: NombreLCL + un combo de símbolos único por persona.
const nuevaClave = (nombre, i) => `${nombre}LCL${barajado[i % barajado.length]}`

const APPLY = process.argv.includes('--apply')

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

// Trae todos los usuarios de Auth (paginado) para resolver el UID por email.
const users = []
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) { console.error('❌ listUsers:', error.message); process.exit(1) }
  users.push(...data.users)
  if (data.users.length < 200) break
}

console.log(`\nModo: ${APPLY ? '🚀 APLICAR' : '🔍 DRY RUN (no cambia nada)'}\n`)
const resultados = []
for (let i = 0; i < USERS.length; i++) {
  const u = USERS[i]
  const found = users.find(x => (x.email || '').toLowerCase() === u.email)
  if (!found) { console.log(`⚠️  ${u.email} → no existe en Auth (salto)`); continue }
  if (!APPLY) { console.log(`${u.email}  → se le pondrá ${nuevaClave(u.nombre, i)}`); continue }
  const clave = nuevaClave(u.nombre, i)
  const { error } = await admin.auth.admin.updateUserById(found.id, { password: clave })
  if (error) { console.log(`   ❌ ${u.email}: ${error.message}`); continue }
  resultados.push({ nombre: u.nombre, email: u.email, clave })
  console.log(`✅ ${u.email}  →  ${clave}`)
}

if (APPLY && resultados.length) {
  // Deja las credenciales en un archivo local temporal para documentarlas.
  const out = '/tmp/lcl-credenciales.txt'
  const txt = resultados.map(r => `${r.nombre}\t${r.email}\t${r.clave}`).join('\n') + '\n'
  writeFileSync(out, txt)
  console.log(`\n📝 Guardadas en ${out} (temporal — para documentar en el vault).`)
}
console.log(`\n${APPLY ? 'Listo. Avisa a cada persona su clave por privado.' : 'Corre con --apply para aplicar.'}\n`)
