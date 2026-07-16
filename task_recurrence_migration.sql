-- ============================================================
-- LCL — Núcleo de tareas: recurrencia / frecuencia
-- Correr en Supabase SQL Editor (proyecto licxcyadmdxpywrigexb)
-- Idempotente: se puede correr varias veces sin romper.
-- ============================================================

alter table tasks
  add column if not exists task_type text not null default 'esporadica'
    check (task_type in ('esporadica','recurrente'));

alter table tasks
  add column if not exists recurrence text
    check (recurrence in ('diaria','semanal','quincenal','mensual','bimestral','trimestral','semestral','anual'));

-- Si una serie recurrente se "detiene", se pone en false y al completar ya no
-- se regenera la siguiente ocurrencia.
alter table tasks
  add column if not exists recurrence_active boolean not null default true;

-- Índice para filtrar recurrentes rápido.
create index if not exists tasks_task_type_idx on tasks (task_type);
