-- ═══════════════════════════════════════════════════════
-- Migración: módulo Cronograma semanal
-- Correr en: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════

create table if not exists schedule_entries (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references profiles(id) on delete cascade,
  week_start   date not null,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  company_id   uuid references companies(id) on delete set null,
  activity     text,
  session      text default 'todo_el_dia',
  notas        text,
  status       text default 'programado',
  created_at   timestamptz default now(),
  unique(profile_id, week_start, day_of_week)
);

alter table schedule_entries enable row level security;

create policy "schedule_entries_all" on schedule_entries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
