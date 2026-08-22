// Migra el email de login de @lcl.com al correo corporativo real.
// El UID no cambia → tareas/asignaciones intactas. Actualiza auth.users
// (con email_confirm para no pedir reconfirmación) y profiles.email.
//
// Uso (más simple — te pide las llaves de Supabase y las pegas):
//   node scripts/migrar-correos.mjs          (DRY RUN, no cambia nada)
//   node scripts/migrar-correos.mjs --apply  (aplica los cambios)
// Las llaves están en Supabase → Settings → API (Project URL + service_role).
import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const MAP = {
  'andrea@lcl.com': 'andrea.berrio@lclgestionempresarial.com',
  'camila@lcl.com': 'camila.lopez@lclgestionempresarial.com',
  'daniel@lcl.com': 'daniel.llano@lclgestionempresarial.com',
  'isabel@lcl.com': 'isabel.llano@lclgestionempresarial.com',
  'laura@lcl.com':  'laura.llano@lclgestionempresarial.com',
  'ximena@lcl.com': 'ximena.vega@lclgestionempresarial.com',
}

const APPLY = process.argv.includes('--apply')

// Toma las llaves del entorno; si faltan, las pide por consola (pegar y Enter).
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

// Trae todos los usuarios de Auth (paginado).
const users = []
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) { console.error('❌ listUsers:', error.message); process.exit(1) }
  users.push(...data.users)
  if (data.users.length < 200) break
}

console.log(`\nModo: ${APPLY ? '🚀 APLICAR' : '🔍 DRY RUN (no cambia nada)'}\n`)
let ok = 0, faltan = 0
for (const [oldEmail, newEmail] of Object.entries(MAP)) {
  const u = users.find(x => (x.email || '').toLowerCase() === oldEmail)
  if (!u) { console.log(`⚠️  ${oldEmail}  →  no existe en Auth (salto)`); faltan++; continue }
  console.log(`${oldEmail.padEnd(18)} →  ${newEmail}   (uid ${u.id})`)
  if (APPLY) {
    const { error: e1 } = await admin.auth.admin.updateUserById(u.id, { email: newEmail, email_confirm: true })
    if (e1) { console.log(`   ❌ auth: ${e1.message}`); continue }
    const { error: e2 } = await admin.from('profiles').update({ email: newEmail }).eq('id', u.id)
    if (e2) console.log(`   ⚠️ profiles: ${e2.message}`)
    console.log('   ✅ actualizado')
    ok++
  }
}
console.log(`\n${APPLY ? `Hecho: ${ok} actualizados, ${faltan} no encontrados.` : 'Dry run listo. Corre con --apply para aplicar.'}\n`)
