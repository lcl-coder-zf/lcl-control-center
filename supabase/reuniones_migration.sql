-- ============================================================
-- LCL — Módulo Reuniones (actas con audio + transcripción Groq)
-- Correr en Supabase SQL Editor (proyecto LCL). Idempotente.
-- ============================================================

-- ── Reuniones ───────────────────────────────────────────────
create table if not exists meetings (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  series       text,                                   -- agrupa la serie: "Reunión Equipo LCL"
  event_id     uuid references events(id)    on delete set null,  -- ligada a la Agenda (opcional)
  company_id   uuid references companies(id) on delete set null,
  meeting_date date not null default current_date,
  audio_url    text,                                   -- URL pública del audio en Storage
  audio_path   text,                                   -- ruta interna en el bucket
  transcript   text,                                   -- transcripción (Whisper/Groq)
  summary      text,                                   -- resumen corto
  acta         text,                                   -- acta (markdown, editable)
  status       text not null default 'borrador',       -- borrador | procesando | listo | error
  created_by   uuid references profiles(id)  on delete set null,
  created_at   timestamptz default now()
);

create table if not exists meeting_attendees (
  id         uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  unique (meeting_id, profile_id)
);

-- Las tareas de seguimiento nacen desde el acta y quedan ligadas a la reunión.
alter table tasks add column if not exists meeting_id uuid references meetings(id) on delete set null;

alter table meetings          enable row level security;
alter table meeting_attendees enable row level security;

drop policy if exists "Equipo meetings"          on meetings;
drop policy if exists "Equipo meeting_attendees" on meeting_attendees;
create policy "Equipo meetings" on meetings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Equipo meeting_attendees" on meeting_attendees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists meetings_date_idx   on meetings (meeting_date desc);
create index if not exists meetings_series_idx on meetings (series);

-- ── Storage: bucket para el audio de las reuniones ──────────
insert into storage.buckets (id, name, public)
values ('reuniones', 'reuniones', true)
on conflict (id) do nothing;

drop policy if exists "reuniones sube"  on storage.objects;
drop policy if exists "reuniones lee"   on storage.objects;
drop policy if exists "reuniones borra" on storage.objects;
create policy "reuniones sube"  on storage.objects for insert to authenticated with check (bucket_id = 'reuniones');
create policy "reuniones lee"   on storage.objects for select using (bucket_id = 'reuniones');
create policy "reuniones borra" on storage.objects for delete to authenticated using (bucket_id = 'reuniones');
