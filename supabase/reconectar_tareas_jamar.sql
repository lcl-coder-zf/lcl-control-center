-- ============================================================
-- Reconectar la(s) tarea(s) de "Proyecto TRANSPORTES JAMAR" al
-- cliente TRANSPORTES JAMAR correcto (el que se ve en Clientes).
-- Cliente correcto: 0b546f43-010e-4b06-a70a-fe9efe303ab7
-- Correr en Supabase SQL Editor.
-- ============================================================

-- Conecta al cliente correcto las tareas cuyo proyecto es el de Jamar.
update tasks t
set company_id = '0b546f43-010e-4b06-a70a-fe9efe303ab7'
from projects p
where t.project_id = p.id
  and p.name = 'Proyecto TRANSPORTES JAMAR';

-- Verificar: deben aparecer con el company_id correcto.
select id, title, company_id, project_id
from tasks
where company_id = '0b546f43-010e-4b06-a70a-fe9efe303ab7';
