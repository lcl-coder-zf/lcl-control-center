-- ============================================================
-- LCL — Equipo: perfil completo (lo llena cada persona)
-- Correr en Supabase SQL Editor. Idempotente.
-- ============================================================
--
-- 1. Campos PÚBLICOS (todo el equipo los ve) → columnas en `profiles`.
-- 2. Campos PRIVADOS (cédula, emergencia, dirección) → tabla aparte
--    `profile_private`, que solo leen el dueño y los admin. Si fueran
--    columnas de `profiles` cualquiera las podría leer por la API REST,
--    porque la política de select de profiles es abierta al equipo.
-- 3. La fecha de ingreso (start_date) solo la cambian los admin (Laura):
--    se agrega al candado de la política "Usuario actualiza su perfil".

-- ── 1. Públicos ──────────────────────────────────────────────
alter table profiles add column if not exists birth_day      smallint check (birth_day between 1 and 31);
alter table profiles add column if not exists birth_month    smallint check (birth_month between 1 and 12);
alter table profiles add column if not exists profesion      text;
alter table profiles add column if not exists especialidades text[] not null default '{}';

-- ── 2. Privados ──────────────────────────────────────────────
create table if not exists profile_private (
  profile_id          uuid primary key references profiles(id) on delete cascade,
  cedula              text,
  direccion           text,
  emergencia_nombre   text,
  emergencia_telefono text,
  updated_at          timestamptz not null default now()
);

alter table profile_private enable row level security;

drop policy if exists "Privado: dueño o admin lee"     on profile_private;
drop policy if exists "Privado: dueño o admin crea"    on profile_private;
drop policy if exists "Privado: dueño o admin edita"   on profile_private;

create policy "Privado: dueño o admin lee" on profile_private for select using (
  profile_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Privado: dueño o admin crea" on profile_private for insert with check (
  profile_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Privado: dueño o admin edita" on profile_private for update using (
  profile_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- La cédula hoy vive en profiles.document_id (visible para todos por la API).
-- Se copia a la tabla privada; la app deja de leerla de profiles.
insert into profile_private (profile_id, cedula)
select id, document_id from profiles
where document_id is not null and document_id <> ''
on conflict (profile_id) do update set cedula = coalesce(profile_private.cedula, excluded.cedula);

-- ── 3. Candado: role, oculta_tareas y start_date no se auto-editan ──
drop policy if exists "Usuario actualiza su perfil" on profiles;
create policy "Usuario actualiza su perfil" on profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role          = (select p.role          from profiles p where p.id = auth.uid())
    and oculta_tareas = (select p.oculta_tareas from profiles p where p.id = auth.uid())
    and start_date is not distinct from (select p.start_date from profiles p where p.id = auth.uid())
  );

-- Pendiente (cuando se confirme que todo lee de profile_private):
--   update profiles set document_id = null;
