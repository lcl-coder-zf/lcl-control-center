import crypto from 'node:crypto'

// Cifrado en reposo para secretos del Vault (vault_items.contrasena,
// usuarios_sistema.pass). AES-256-GCM con clave en process.env.VAULT_ENC_KEY.
// SOLO servidor: la clave nunca llega al bundle (el repo es público).
//
// Formato guardado: 'enc::' + base64(iv[12] | tag[16] | ciphertext).
// Compatibilidad: valores sin el prefijo se tratan como texto plano legado, así
// migrar es opcional/gradual y nada se rompe antes de correr la migración.
const PREFIX = 'enc::'

function getKey(): Buffer {
  const raw = process.env.VAULT_ENC_KEY
  if (!raw) throw new Error('Falta VAULT_ENC_KEY')
  // Acepta hex (64 chars) o base64 (32 bytes).
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('VAULT_ENC_KEY debe ser de 32 bytes (hex de 64 o base64)')
  return buf
}

export function isEncrypted(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(PREFIX)
}

// Cifra un secreto. Ya cifrado o vacío → se devuelve tal cual. Lanza si no hay
// clave (a propósito: mejor fallar fuerte que guardar en claro creyendo que no).
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return plain ?? null
  if (isEncrypted(plain)) return plain
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64')
}

// Descifra. Texto plano legado (sin prefijo) o vacío → se devuelve tal cual.
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === '') return stored ?? null
  if (!isEncrypted(stored)) return stored
  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const ct = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
