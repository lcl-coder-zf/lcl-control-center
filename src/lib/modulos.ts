// ============================================================
// Fuente ÚNICA de verdad de los módulos de LCL.
// La consumen: el Sidebar (menú), el layout (guard) y
// /configuracion (gestor de roles y permisos).
// Agregar un módulo aquí lo hace aparecer en las 3 partes.
// (Port del patrón de lib/modulos.ts del Control Tower de Jamar.)
// ============================================================

export type GrupoModulo = 'Operación' | 'Sistema'

export type Modulo = {
  slug: string          // ruta sin la "/" inicial (ej. "vault" → /vault)
  label: string
  grupo: GrupoModulo
  roles: string[]       // roles con acceso por defecto. [] = todos los logueados
}

export const GRUPOS_ORDEN: GrupoModulo[] = ['Operación', 'Sistema']

export const MODULOS: Modulo[] = [
  // ── Operación ──
  { slug: 'dashboard',     label: 'Dashboard',     grupo: 'Operación', roles: [] },
  { slug: 'clientes',      label: 'Clientes',      grupo: 'Operación', roles: [] },
  { slug: 'tareas',        label: 'Tareas',        grupo: 'Operación', roles: [] },
  { slug: 'agenda',        label: 'Agenda',        grupo: 'Operación', roles: [] },
  { slug: 'cronograma',    label: 'Cronograma',    grupo: 'Operación', roles: [] },
  { slug: 'equipo',        label: 'Equipo',        grupo: 'Operación', roles: [] },
  // ── Sistema ──
  { slug: 'vault',         label: 'Vault',         grupo: 'Sistema',   roles: ['admin'] },
  { slug: 'configuracion', label: 'Configuración', grupo: 'Sistema',   roles: [] },
]

export function moduloBySlug(slug: string): Modulo | undefined {
  return MODULOS.find((m) => m.slug === slug)
}

// Módulos que un rol ve por defecto (derivado del catálogo del código).
// Se usa para sembrar/mostrar los permisos por defecto de un rol nuevo.
export function modulosDefaultDeRol(rol: string): string[] {
  return MODULOS
    .filter((m) => m.roles.length === 0 || m.roles.includes(rol))
    .map((m) => m.slug)
}

// ¿El usuario puede ver este módulo?
//   modulosOverride → override por usuario (prioridad absoluta)
//   rolModulos      → lista de módulos del rol (tabla roles_app).
//                     null/undefined = usar los defaults del código.
//   modulosApagados → módulos apagados globalmente (modulos_sistema).
export function puedeVerModulo(
  slug: string,
  opts: {
    rol?: string | null
    modulosOverride?: Record<string, boolean> | null
    rolModulos?: string[] | null
    modulosApagados?: string[] | null
  },
): boolean {
  const { rol, modulosOverride, rolModulos, modulosApagados } = opts
  // Apagado globalmente = oculto para todos (excepto Configuración, que nunca se apaga).
  if (slug !== 'configuracion' && modulosApagados?.includes(slug)) return false
  if (modulosOverride) {
    if (modulosOverride[slug] === false) return false
    if (modulosOverride[slug] === true) return true
  }
  const mod = moduloBySlug(slug)
  if (!mod) return true                       // ruta desconocida → permitir
  if (mod.roles.length === 0) return true      // módulo abierto a todos
  if (rolModulos != null) return rolModulos.includes(slug) // rol con permisos definidos
  if (!rol) return false
  return mod.roles.includes(rol)               // fallback: defaults del código
}
