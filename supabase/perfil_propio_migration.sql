-- ============================================================
-- LCL — Blindaje de "Usuario actualiza su perfil"
-- Correr en Supabase SQL Editor. Idempotente.
-- ============================================================
--
-- PROBLEMA (preexistente, no lo introdujo el módulo "Mi cuenta"):
-- La política original de supabase-schema.sql es
--
--     create policy "Usuario actualiza su perfil" on profiles
--       for update using (auth.uid() = id);
--
-- El `using` decide qué FILAS puedes tocar, pero sin `with check` no hay
-- ninguna restricción sobre los VALORES que escribes. Es decir: una consultora
-- puede pegarle directo a la API REST de Supabase con su propio token y correr
-- `update profiles set role='admin' where id = <su id>` — y quedar super admin,
-- con acceso al Vault y a las tareas ocultas de Laura.
--
-- La app nunca manda `role` desde el formulario de "Mi perfil", así que esto
-- no se puede hacer desde la interfaz. Pero la política sí lo permite.
--
-- ARREGLO: agregar `with check` para que nadie pueda auto-modificarse los
-- campos sensibles (role y oculta_tareas). Los demás campos —cédula, teléfono,
-- bio— siguen siendo editables por su dueño, que es justo lo que queremos para
-- que cada quien complete su propio perfil.
--
-- Los super admin no se ven afectados: siguen entrando por la política
-- "Admin edita perfiles" de roles_events_migration.sql, que no tiene este
-- candado y les permite cambiar roles desde Configuración.

drop policy if exists "Usuario actualiza su perfil" on profiles;

create policy "Usuario actualiza su perfil" on profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Los campos sensibles deben quedar exactamente como estaban.
    and role          = (select p.role          from profiles p where p.id = auth.uid())
    and oculta_tareas = (select p.oculta_tareas from profiles p where p.id = auth.uid())
  );
