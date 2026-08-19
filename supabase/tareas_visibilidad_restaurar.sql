-- LCL — RESTAURAR la política de visibilidad de tareas.
-- Correr en Supabase SQL Editor. Idempotente.
--
-- Contexto: una versión anterior de esta política incluía una subconsulta que
-- referenciaba la MISMA tabla `tasks` dentro de su propia regla RLS, lo que
-- provoca recursión infinita y hace que TODAS las consultas de tareas fallen
-- (Dashboard, módulo Tareas y tareas dentro de cada cliente quedaban en 0).
--
-- Esta política restaura el comportamiento seguro original: los admin ven todo
-- y el resto ve todo salvo lo de personas con oculta_tareas=true. El acotar
-- "cada consultora ve solo las suyas" en el módulo Tareas se hace en el
-- frontend, así la vista de cada cliente sigue mostrando todas sus tareas.

drop policy if exists "Equipo ve tareas" on tasks;
create policy "Equipo ve tareas" on tasks for select using (
  auth.role() = 'authenticated' and (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or not exists (select 1 from profiles pr where pr.id = tasks.assigned_to and pr.oculta_tareas = true)
  )
);
