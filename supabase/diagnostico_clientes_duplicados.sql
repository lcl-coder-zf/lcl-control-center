-- ============================================================
-- Diagnóstico: clientes duplicados (mismo nombre)
-- Correr en Supabase SQL Editor. Solo LEE, no cambia nada.
-- ============================================================

-- 1) Nombres de cliente que aparecen más de una vez.
select name, count(*) as veces, array_agg(id) as ids
from companies
group by name
having count(*) > 1
order by name;

-- 2) Para un nombre puntual, ver cada registro y cuántas tareas/proyectos tiene.
--    Cambia 'TRANSPORTES JAMAR S.A.S' por el que quieras revisar.
select
  c.id,
  c.name,
  c.created_at,
  (select count(*) from tasks    t where t.company_id = c.id) as tareas_directas,
  (select count(*) from projects p where p.company_id = c.id) as proyectos
from companies c
where c.name = 'TRANSPORTES JAMAR S.A.S'
order by c.created_at;

-- 3) Tareas "huérfanas" que solo tienen proyecto (sin company_id).
select t.id, t.title, t.company_id, t.project_id, p.name as proyecto, p.company_id as company_del_proyecto
from tasks t
left join projects p on p.id = t.project_id
where t.company_id is null and t.project_id is not null;
