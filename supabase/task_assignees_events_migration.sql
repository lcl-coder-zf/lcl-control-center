-- ═══════════════════════════════════════════════════════════
-- Migración: multi-asignados en tareas + multi-día en eventos
-- Correr en: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Tabla task_assignees
create table if not exists task_assignees (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(task_id, profile_id)
);

alter table task_assignees enable row level security;

create policy "task_assignees_all" on task_assignees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 2. Eventos: columnas multi-día y todo-el-día
alter table events add column if not exists end_date date;
alter table events add column if not exists all_day boolean default false;
