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
    parent_id:        task.parent_id ?? null,
    created_by:       task.created_by ?? null,
  }]).select('*, companies(id, name), projects(id, name), profiles!tasks_assigned_to_fkey(id, full_name)').single()

  return data
}
