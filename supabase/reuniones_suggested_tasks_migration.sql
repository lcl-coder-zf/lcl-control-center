-- Reuniones — persistir las tareas que la IA sugiere desde el acta.
-- Antes solo vivían en memoria tras "Transcribir"; ahora quedan en la reunión
-- para poder revisarlas/crearlas después. Ejecutar en Supabase SQL Editor.

alter table meetings add column if not exists suggested_tasks jsonb not null default '[]'::jsonb;
