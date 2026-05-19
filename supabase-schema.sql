-- ============================================================
--  LCL Control Center — Schema completo
--  Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES (usuarios del sistema)
-- ============================================================
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text not null,
  role        text not null check (role in ('admin', 'consultant')) default 'consultant',
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Trigger: crear perfil automáticamente al registrar usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'consultant')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. COMPANIES (clientes)
-- ============================================================
create table if not exists companies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  nit             text,
  sector          text,
  city            text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  service_type    text,
  status          text not null check (status in ('activo', 'inactivo', 'suspendido')) default 'activo',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 3. PROJECTS
-- ============================================================
create table if not exists projects (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid references companies(id) on delete cascade,
  name            text not null,
  type            text not null check (type in ('BASC','ISO','SAGRILAFT','PTEE','SG-SST','Otro')) default 'Otro',
  status          text not null check (status in ('activo','pausado','completado','cancelado')) default 'activo',
  progress        integer default 0 check (progress between 0 and 100),
  responsible_id  uuid references profiles(id),
  start_date      date not null default current_date,
  end_date        date,
  value           numeric(12,0),
  paid            numeric(12,0) default 0,
  risks           text,
  next_action     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 4. TASKS
-- ============================================================
create table if not exists tasks (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid references projects(id) on delete set null,
  company_id      uuid references companies(id) on delete set null,
  title           text not null,
  description     text,
  assigned_to     uuid references profiles(id),
  priority        text not null check (priority in ('baja','media','alta','critica')) default 'media',
  status          text not null check (status in ('pendiente','en_progreso','completada','vencida')) default 'pendiente',
  due_date        date not null,
  completed_at    timestamptz,
  created_by      uuid references profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 5. CALENDAR EVENTS (vencimientos)
-- ============================================================
create table if not exists calendar_events (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid references companies(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  title           text not null,
  type            text not null check (type in ('recertificacion','auditoria','entrega','reporte','vencimiento')) default 'vencimiento',
  due_date        date not null,
  alert_15        boolean default true,
  alert_7         boolean default true,
  alert_1         boolean default true,
  status          text not null check (status in ('pendiente','completado','vencido')) default 'pendiente',
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- 6. DOCUMENTS
-- ============================================================
create table if not exists documents (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid references companies(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  name            text not null,
  type            text not null,
  status          text not null check (status in ('aprobado','pendiente','vencido')) default 'pendiente',
  file_url        text,
  version         text default '1.0',
  expires_at      date,
  uploaded_by     uuid references profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table profiles       enable row level security;
alter table companies      enable row level security;
alter table projects       enable row level security;
alter table tasks          enable row level security;
alter table calendar_events enable row level security;
alter table documents      enable row level security;

-- Profiles: todos ven todos los perfiles del equipo
create policy "Equipo puede ver perfiles" on profiles
  for select using (auth.role() = 'authenticated');

create policy "Usuario actualiza su perfil" on profiles
  for update using (auth.uid() = id);

-- Companies, Projects, Tasks, Calendar, Documents: equipo autenticado tiene acceso completo
create policy "Equipo ve clientes" on companies for select using (auth.role() = 'authenticated');
create policy "Equipo crea clientes" on companies for insert with check (auth.role() = 'authenticated');
create policy "Equipo edita clientes" on companies for update using (auth.role() = 'authenticated');
create policy "Admin elimina clientes" on companies for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Equipo ve proyectos" on projects for select using (auth.role() = 'authenticated');
create policy "Equipo crea proyectos" on projects for insert with check (auth.role() = 'authenticated');
create policy "Equipo edita proyectos" on projects for update using (auth.role() = 'authenticated');
create policy "Admin elimina proyectos" on projects for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Equipo ve tareas" on tasks for select using (auth.role() = 'authenticated');
create policy "Equipo crea tareas" on tasks for insert with check (auth.role() = 'authenticated');
create policy "Equipo edita tareas" on tasks for update using (auth.role() = 'authenticated');
create policy "Equipo elimina tareas" on tasks for delete using (auth.role() = 'authenticated');

create policy "Equipo ve eventos" on calendar_events for select using (auth.role() = 'authenticated');
create policy "Equipo crea eventos" on calendar_events for insert with check (auth.role() = 'authenticated');
create policy "Equipo edita eventos" on calendar_events for update using (auth.role() = 'authenticated');
create policy "Equipo elimina eventos" on calendar_events for delete using (auth.role() = 'authenticated');

create policy "Equipo ve documentos" on documents for select using (auth.role() = 'authenticated');
create policy "Equipo crea documentos" on documents for insert with check (auth.role() = 'authenticated');
create policy "Equipo edita documentos" on documents for update using (auth.role() = 'authenticated');
create policy "Equipo elimina documentos" on documents for delete using (auth.role() = 'authenticated');

-- ============================================================
-- USUARIOS INICIALES
-- IMPORTANTE: Estos se crean desde Authentication > Users en Supabase
-- Luego actualizar sus roles con este UPDATE:
-- ============================================================

-- Después de crear los usuarios en Supabase Auth, ejecuta:
-- UPDATE profiles SET role = 'admin' WHERE email = 'laura@lcl.com';
-- (Las empleadas quedan como 'consultant' por defecto)
