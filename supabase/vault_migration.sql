-- ============================================================
-- LCL — Vault de contraseñas (solo admins: Laura y Daniel)
-- Correr en Supabase SQL Editor. Idempotente.
-- Protección: RLS restringe TODO a usuarios con role='admin'.
-- El PIN 1112 es una segunda barrera en la UI.
-- ============================================================

create table if not exists vault_items (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  usuario     text,
  contrasena  text,
  url         text,
  notas       text,
  categoria   text not null default 'otro',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table vault_items enable row level security;

-- Helper: ¿el usuario actual es admin?
-- (Laura y Daniel son los únicos con role='admin'.)
drop policy if exists "Admin ve vault"     on vault_items;
drop policy if exists "Admin crea vault"   on vault_items;
drop policy if exists "Admin edita vault"  on vault_items;
drop policy if exists "Admin borra vault"  on vault_items;

create policy "Admin ve vault" on vault_items for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin crea vault" on vault_items for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin edita vault" on vault_items for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin borra vault" on vault_items for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
