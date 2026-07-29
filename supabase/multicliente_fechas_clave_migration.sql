-- ═══════════════════════════════════════════════════════════
-- Migración: tareas multi-cliente + aviso anticipado (fechas
-- clave) + varias actividades por día en el cronograma.
-- Correr en: Supabase → SQL Editor. Idempotente.
-- Pedido por Ximena (jul 2026).
-- ═══════════════════════════════════════════════════════════

-- ── 1. Tareas para varios clientes ──────────────────────────
-- Mismo patrón que task_assignees: `tasks.company_id` sigue
-- siendo el cliente principal (compatibilidad) y esta tabla
-- guarda la lista completa. Una sola tarea, N clientes: se
-- completa una vez y queda lista para todos.
create table if not exists task_companies (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz default now(),
  unique(task_id, company_id)
);

create index if not exists idx_task_companies_company on task_companies(company_id);

alter table task_companies enable row level security;

drop policy if exists "task_companies_all" on task_companies;
create policy "task_companies_all" on task_companies
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Backfill: todas las tareas que ya tienen cliente entran a la tabla,
-- para que la ficha de cliente y el dashboard no pierdan nada.
insert into task_companies (task_id, company_id)
select id, company_id from tasks where company_id is not null
on conflict (task_id, company_id) do nothing;

-- ── 2. Aviso anticipado (fechas clave) ──────────────────────
-- Días de anticipación con los que hay que avisar. Null o 0 =
-- solo avisa el día del vencimiento, como hasta ahora.
-- Ej: renovación anual el 31 de marzo con aviso 30 → push el 1 de marzo.
alter table tasks add column if not exists aviso_dias_antes smallint;

-- ── 3. Cronograma: varias actividades el mismo día ──────────
-- Antes había unique(profile_id, week_start, day_of_week), o sea
-- una sola entrada por persona por día. Por eso no se podía poner
-- medio día en un cliente y medio día en otro.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'schedule_entries'::regclass and contype = 'u'
  loop
    execute format('alter table schedule_entries drop constraint %I', c.conname);
  end loop;
end $$;

-- Orden dentro del día (0 = primera actividad de la mañana).
alter table schedule_entries add column if not exists orden smallint not null default 0;

create index if not exists idx_schedule_entries_dia
  on schedule_entries(profile_id, week_start, day_of_week);
