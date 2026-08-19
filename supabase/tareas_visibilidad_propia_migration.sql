-- LCL — Tareas: cada consultor ve SOLO las suyas; los admin (superadmin) ven todo.
-- Reemplaza la política anterior (basada en oculta_tareas) de roles_events_migration.sql.
--
-- OJO: la RLS es global, así que esto también aplica al Dashboard y a cualquier
-- consulta de tasks. Un consultor solo recibirá sus tareas en TODA la app
-- (que es justo lo que se pidió). Los admin no cambian: siguen viendo todo.

drop policy if exists "Equipo ve tareas" on tasks;

create policy "Equipo ve tareas" on tasks for select using (
  auth.role() = 'authenticated' and (
    -- 1) Los admin (superadmin) ven todo
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    -- 2) Responsable directo de la tarea
    or tasks.assigned_to = auth.uid()
    -- 3) Asignación múltiple (task_assignees)
    or exists (
      select 1 from task_assignees ta
      where ta.task_id = tasks.id and ta.profile_id = auth.uid()
    )
    -- 4) Subtareas de una tarea que sí me pertenece (para que se vean anidadas)
    or exists (
      select 1 from tasks parent
      where parent.id = tasks.parent_id and (
        parent.assigned_to = auth.uid()
        or exists (
          select 1 from task_assignees ta
          where ta.task_id = parent.id and ta.profile_id = auth.uid()
        )
      )
    )
  )
);
