-- ============================================================
-- LCL — Solo los ADMIN (Laura, Daniel, Isa) pueden ELIMINAR reuniones.
-- Correr en Supabase SQL Editor. Idempotente.
--
-- Contexto: la política "Equipo meetings" era `for all` a cualquier
-- autenticado, lo que incluía DELETE. Aquí la partimos por comando:
-- select/insert/update siguen abiertos al equipo, pero DELETE queda
-- restringido a role='admin'. (Los borrados en cascada de
-- meeting_attendees por FK no pasan por RLS, así que no se afectan.)
-- ============================================================

alter table meetings enable row level security;

-- Quitamos la política amplia y la reemplazamos por uná granular.
drop policy if exists "Equipo meetings"        on meetings;
drop policy if exists "meetings select equipo" on meetings;
drop policy if exists "meetings insert equipo" on meetings;
drop policy if exists "meetings update equipo" on meetings;
drop policy if exists "meetings delete admin"  on meetings;

-- Ver / crear / editar: cualquier miembro del equipo autenticado.
create policy "meetings select equipo" on meetings
  for select using (auth.role() = 'authenticated');

create policy "meetings insert equipo" on meetings
  for insert with check (auth.role() = 'authenticated');

create policy "meetings update equipo" on meetings
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Eliminar: SOLO super admin (role='admin').
create policy "meetings delete admin" on meetings
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
