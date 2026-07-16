-- ============================================================
-- LCL — Módulo Agenda: Auditorías + Indicadores por responsable
-- Reemplaza el viejo módulo de Vencimientos (calendar_events queda sin uso).
-- Correr en Supabase SQL Editor. Idempotente.
-- ============================================================

-- Agenda de auditorías
create table if not exists audits (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid references companies(id) on delete set null,
  responsable_id uuid references profiles(id) on delete set null,
  title          text,
  audit_kind     text not null default 'interna' check (audit_kind in ('interna','externa')),
  audit_date     date not null,
  status         text not null default 'programada' check (status in ('programada','hecha')),
  notas          text,
  created_at     timestamptz default now()
);

-- Agenda de indicadores (entregas periódicas por responsable)
create table if not exists indicators (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  responsable_id uuid references profiles(id) on delete set null,
  company_id     uuid references companies(id) on delete set null,
  frequency      text check (frequency in ('diaria','semanal','quincenal','mensual','bimestral','trimestral','semestral','anual')),
  due_date       date not null,
  status         text not null default 'pendiente' check (status in ('pendiente','entregado')),
  notas          text,
  created_at     timestamptz default now()
);

alter table audits     enable row level security;
alter table indicators enable row level security;

-- Acceso completo para el equipo autenticado (igual que tasks).
drop policy if exists "Equipo audits"     on audits;
drop policy if exists "Equipo indicators" on indicators;

create policy "Equipo audits" on audits
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Equipo indicators" on indicators
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists audits_date_idx      on audits (audit_date);
create index if not exists indicators_resp_idx  on indicators (responsable_id);
