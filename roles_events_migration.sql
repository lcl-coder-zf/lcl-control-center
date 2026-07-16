-- ============================================================
-- LCL — Roles/visibilidad de tareas + Eventos (calendario con invitados)
-- Correr en Supabase SQL Editor. Idempotente.
-- ============================================================

-- ── 1. Visibilidad de tareas ────────────────────────────────
-- Flag por persona: si está en true, los consultores NO ven las tareas
-- asignadas a esa persona. Los super admin (role='admin') ven todo.
alter table profiles add column if not exists oculta_tareas boolean not null default false;

-- Laura: sus tareas quedan ocultas para los consultores (Daniel NO).
update profiles set oculta_tareas = true  where email = 'laura@lcl.com';
update profiles set oculta_tareas = false where email = 'daniel@lcl.com';

-- Admins pueden editar cualquier perfil (para el módulo Configuración).
drop policy if exists "Admin edita perfiles" on profiles;
create policy "Admin edita perfiles" on profiles for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Regla de visibilidad en tareas (reemplaza el SELECT abierto).
drop policy if exists "Equipo ve tareas" on tasks;
create policy "Equipo ve tareas" on tasks for select using (
  auth.role() = 'authenticated' and (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or not exists (select 1 from profiles pr where pr.id = tasks.assigned_to and pr.oculta_tareas = true)
  )
);

-- ── 2. Eventos (calendario + invitados) ─────────────────────
create table if not exists events (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  event_type   text not null default 'reunion',   -- auditoria | reunion | <libre>
  company_id   uuid references companies(id) on delete set null,
  organizer_id uuid references profiles(id) on delete set null,
  event_date   date not null,
  event_time   time,
  status       text not null default 'programado' check (status in ('programado','hecho')),
  notas        text,
  created_at   timestamptz default now()
);

create table if not exists event_attendees (
  id         uuid primary key default uuid_generate_v4(),
  event_id   uuid references events(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  unique (event_id, profile_id)
);

alter table events          enable row level security;
alter table event_attendees enable row level security;

drop policy if exists "Equipo events"          on events;
drop policy if exists "Equipo event_attendees" on event_attendees;

create policy "Equipo events" on events
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Equipo event_attendees" on event_attendees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists events_date_idx on events (event_date);
