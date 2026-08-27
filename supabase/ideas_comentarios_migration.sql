-- ============================================================
-- LCL — Módulo de Ideas (captura rápida para no olvidarlas)
--       + Comentarios/notas en las tareas.
-- Idempotente.
-- ============================================================

-- ── Ideas ──────────────────────────────────────────────────
create table if not exists ideas (
  id         uuid primary key default uuid_generate_v4(),
  texto      text not null,                 -- la idea en sí (captura libre)
  estado     text not null default 'nueva'  -- nueva | archivada
             check (estado in ('nueva','archivada')),
  autor_id   uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ideas_estado  ON ideas(estado);
create index if not exists idx_ideas_creada   ON ideas(created_at desc);

alter table ideas enable row level security;
drop policy if exists "Equipo ideas" on ideas;
create policy "Equipo ideas" on ideas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ── Comentarios / notas en tareas ──────────────────────────
-- Notas sueltas de la tarea: lo que quedó pendiente o cualquier apunte,
-- que se puede llenar al registrar la tarea o antes de cerrarla.
alter table tasks add column if not exists comentarios text;
