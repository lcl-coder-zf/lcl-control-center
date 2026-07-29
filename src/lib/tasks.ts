// Núcleo de tareas — recurrencia / frecuencia.
// Compartido por el módulo Tareas y el panel de tareas de Proyectos.
import type { SupabaseClient } from '@supabase/supabase-js'

export type TaskType = 'esporadica' | 'recurrente'
export type Recurrence =
  | 'diaria' | 'semanal' | 'quincenal' | 'mensual'
  | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

// Config visual + salto de fecha para cada frecuencia.
export const RECURRENCE_CONFIG: Record<Recurrence, { label: string; short: string; days?: number; months?: number }> = {
  diaria:     { label: 'Diaria',      short: 'Diaria',  days: 1 },
  semanal:    { label: 'Semanal',     short: 'Sem',     days: 7 },
  quincenal:  { label: 'Quincenal',   short: 'Quinc',   days: 15 },
  mensual:    { label: 'Mensual',     short: 'Mes',     months: 1 },
  bimestral:  { label: 'Bimestral',   short: 'Bim',     months: 2 },
  trimestral: { label: 'Trimestral',  short: 'Trim',    months: 3 },
  semestral:  { label: 'Semestral',   short: 'Sem.',    months: 6 },
  anual:      { label: 'Anual',       short: 'Año',     months: 12 },
}

export const RECURRENCE_OPTIONS = Object.keys(RECURRENCE_CONFIG) as Recurrence[]

// Anticipación del aviso. La documentación de algunas obligaciones se empieza
// a pedir semanas antes de la fecha, así que avisar el mismo día no sirve.
export const AVISO_OPCIONES: { value: number; label: string; short: string }[] = [
  { value: 0,  label: 'Solo el día del vencimiento', short: 'Sin aviso previo' },
  { value: 7,  label: 'Una semana antes',            short: '7 días antes' },
  { value: 15, label: 'Quince días antes',           short: '15 días antes' },
  { value: 30, label: 'Un mes antes',                short: '1 mes antes' },
  { value: 60, label: 'Dos meses antes',             short: '2 meses antes' },
]

export const avisoLabel = (dias?: number | null): string | null =>
  !dias ? null : (AVISO_OPCIONES.find(o => o.value === dias)?.short ?? `${dias} días antes`)

// ── Clientes de una tarea ─────────────────────────────────────
// Una tarea puede ser para varios clientes (task_companies). `company_id`
// sigue siendo el principal, así que estos helpers leen la lista completa
// y caen al campo viejo si la tarea todavía no tiene filas en la tabla.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function taskCompanyIds(t: any): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromJunction = (t?.task_companies ?? []).map((c: any) => c.company_id).filter(Boolean)
  if (fromJunction.length > 0) return [...new Set<string>(fromJunction)]
  return t?.company_id ? [t.company_id] : []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function taskCompanyNames(t: any): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromJunction = (t?.task_companies ?? []).map((c: any) => c.companies?.name).filter(Boolean)
  if (fromJunction.length > 0) return [...new Set<string>(fromJunction)]
  return t?.companies?.name ? [t.companies.name] : []
}

/** Etiqueta corta para notificaciones: "Plus Carga · Cargaceros". */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function taskCompanyLabel(t: any): string {
  return taskCompanyNames(t).join(' · ')
}

// Parseo seguro de un 'date' (YYYY-MM-DD) al mediodía local para evitar corrimientos de zona horaria.
function parseLocal(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Siguiente fecha de vencimiento según la frecuencia. Devuelve YYYY-MM-DD.
export function nextDueDate(dueDate: string, recurrence: Recurrence): string {
  const cfg = RECURRENCE_CONFIG[recurrence]
  const d = parseLocal(dueDate)
  if (cfg.days) d.setDate(d.getDate() + cfg.days)
  if (cfg.months) d.setMonth(d.getMonth() + cfg.months)
  return fmt(d)
}

// Al completar una tarea recurrente y activa, inserta la siguiente ocurrencia.
// Devuelve la nueva tarea insertada (o null si no aplica).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function regenerateIfRecurring(supabase: SupabaseClient, task: any): Promise<any | null> {
  if (task?.task_type !== 'recurrente') return null
  if (task?.recurrence_active === false) return null
  if (!task?.recurrence) return null

  const due = nextDueDate(task.due_date, task.recurrence as Recurrence)
  const { data } = await supabase.from('tasks').insert([{
    title:            task.title,
    description:      task.description ?? null,
    company_id:       task.company_id ?? null,
    project_id:       task.project_id ?? null,
    assigned_to:      task.assigned_to ?? null,
    priority:         task.priority ?? 'media',
    status:           'pendiente',
    due_date:         due,
    task_type:        'recurrente',
    recurrence:       task.recurrence,
    recurrence_active: true,
    aviso_dias_antes: task.aviso_dias_antes ?? null,
    parent_id:        task.parent_id ?? null,
    created_by:       task.created_by ?? null,
  }]).select('*, companies(id, name), projects(id, name), profiles!tasks_assigned_to_fkey(id, full_name), task_companies(company_id, companies(id, name))').single()

  // La ocurrencia nueva hereda co-asignados y clientes de la anterior; si no,
  // una tarea multi-cliente o multi-persona se degradaba sola cada ciclo.
  if (data?.id) await copiarRelaciones(supabase, task.id, data.id)

  return data
}

async function copiarRelaciones(supabase: SupabaseClient, desdeId: string, haciaId: string): Promise<void> {
  const [asignados, clientes] = await Promise.all([
    supabase.from('task_assignees').select('profile_id').eq('task_id', desdeId),
    supabase.from('task_companies').select('company_id').eq('task_id', desdeId),
  ])

  const filasAsignados = (asignados.data ?? []).map((a: { profile_id: string }) => ({
    task_id: haciaId, profile_id: a.profile_id,
  }))
  const filasClientes = (clientes.data ?? []).map((c: { company_id: string }) => ({
    task_id: haciaId, company_id: c.company_id,
  }))

  await Promise.all([
    filasAsignados.length ? supabase.from('task_assignees').insert(filasAsignados) : Promise.resolve(),
    filasClientes.length  ? supabase.from('task_companies').insert(filasClientes)  : Promise.resolve(),
  ])
}
