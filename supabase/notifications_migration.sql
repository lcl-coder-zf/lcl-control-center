-- ============================================================
-- LCL — Notificaciones in-app (campana)
-- Correr en Supabase SQL Editor. Idempotente.
-- ============================================================

create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,  -- destinatario
  type       text not null,   -- tarea_asignada | evento_invitado | cliente_nuevo | indicador_nuevo
  message    text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

drop policy if exists "ve sus notis"      on notifications;
drop policy if exists "crea notis"        on notifications;
drop policy if exists "actualiza sus notis" on notifications;

-- Cada quien ve/actualiza SOLO sus notis; cualquiera autenticado puede crear
-- (para notificar a otros al crear tareas/eventos).
create policy "ve sus notis" on notifications for select using (user_id = auth.uid());
create policy "crea notis" on notifications for insert with check (auth.role() = 'authenticated');
create policy "actualiza sus notis" on notifications for update using (user_id = auth.uid());

create index if not exists notifications_user_idx on notifications (user_id, read, created_at desc);
