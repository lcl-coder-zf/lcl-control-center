// Helpers del perfil de equipo (cumpleaños, aniversario, % completo).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = any

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function hoy(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Días hasta la próxima vez que cae (mes, día). 0 = hoy.
function diasHasta(month: number, day: number): number {
  const h = hoy()
  let next = new Date(h.getFullYear(), month - 1, day)
  if (next < h) next = new Date(h.getFullYear() + 1, month - 1, day)
  return Math.round((next.getTime() - h.getTime()) / 86400000)
}

/** Días hasta el cumpleaños, o null si no lo ha llenado. */
export function diasACumple(p: Profile): number | null {
  if (!p?.birth_month || !p?.birth_day) return null
  return diasHasta(p.birth_month, p.birth_day)
}

export function cumpleLabel(p: Profile): string {
  return `${p.birth_day} ${MESES[p.birth_month - 1]}`
}

/** Próximo aniversario en LCL: días que faltan y años que cumple. */
export function aniversario(p: Profile): { dias: number; anos: number } | null {
  if (!p?.start_date) return null
  const [y, m, d] = String(p.start_date).slice(0, 10).split('-').map(Number)
  const h = hoy()
  const yaPasoEsteAno = new Date(h.getFullYear(), m - 1, d) < h
  const dias = diasHasta(m, d)
  const anos = h.getFullYear() + (yaPasoEsteAno ? 1 : 0) - y
  return anos > 0 ? { dias, anos } : null
}

/** Campos que cuenta "perfil completo". Los privados solo los ve el dueño/admin. */
export const CAMPOS_PUBLICOS: { key: string; label: string; ok: (p: Profile) => boolean }[] = [
  { key: 'phone',          label: 'Teléfono',        ok: p => !!p.phone?.trim() },
  { key: 'bio',            label: 'Descripción',     ok: p => !!p.bio?.trim() },
  { key: 'birth',          label: 'Cumpleaños',      ok: p => !!p.birth_month && !!p.birth_day },
  { key: 'profesion',      label: 'Profesión',       ok: p => !!p.profesion?.trim() },
  { key: 'especialidades', label: 'Especialidades',  ok: p => (p.especialidades ?? []).length > 0 },
]

export const CAMPOS_PRIVADOS: { key: string; label: string; ok: (x: Profile) => boolean }[] = [
  { key: 'cedula',     label: 'Cédula',                 ok: x => !!x?.cedula?.trim() },
  { key: 'direccion',  label: 'Dirección',              ok: x => !!x?.direccion?.trim() },
  { key: 'emergencia', label: 'Contacto de emergencia', ok: x => !!x?.emergencia_nombre?.trim() && !!x?.emergencia_telefono?.trim() },
]

/** % de perfil completo. Sin `priv` cuenta solo lo público (lo que ve el equipo). */
export function completitud(p: Profile, priv?: Profile): number {
  const campos = priv === undefined
    ? CAMPOS_PUBLICOS.map(c => c.ok(p))
    : [...CAMPOS_PUBLICOS.map(c => c.ok(p)), ...CAMPOS_PRIVADOS.map(c => c.ok(priv))]
  return Math.round((campos.filter(Boolean).length / campos.length) * 100)
}
