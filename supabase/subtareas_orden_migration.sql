-- LCL — Orden manual de subtareas (drag & drop tipo Notion).
-- Correr en Supabase SQL Editor. Idempotente.
--
-- Guarda la posición de cada subtarea dentro de su tarea padre. Menor = más arriba.
-- Las tareas de nivel superior no usan este campo (se ordenan por fecha).

alter table tasks add column if not exists position smallint not null default 0;
