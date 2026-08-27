-- ============================================================
-- LCL — Comentarios de tareas como HILO con autor y fecha.
-- Antes era un texto suelto (tasks.comentarios). Ahora cada comentario
-- guarda quién lo escribió y cuándo: [{ id, texto, autor, autor_id, fecha }].
-- Idempotente.
-- ============================================================

alter table tasks add column if not exists comentarios_log jsonb default '[]'::jsonb;

-- Migra el comentario de texto suelto (si alguien alcanzó a escribir uno) a una
-- entrada del hilo. Autor desconocido (no se guardaba antes).
update tasks
   set comentarios_log = jsonb_build_array(jsonb_build_object(
         'id',       gen_random_uuid(),
         'texto',    comentarios,
         'autor',    null,
         'autor_id', null,
         'fecha',    now()))
 where comentarios is not null
   and btrim(comentarios) <> ''
   and (comentarios_log is null or jsonb_array_length(comentarios_log) = 0);
