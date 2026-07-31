-- ============================================================
-- LCL — Recurrencia semanal por días específicos
-- Correr en Supabase SQL Editor (proyecto licxcyadmdxpywrigexb)
-- Idempotente: se puede correr varias veces sin romper.
-- ============================================================

-- Días de la semana en que se repite una tarea 'semanal'.
-- Convención JS getDay(): 0=Domingo … 6=Sábado. Ej.: {2,4} = martes y jueves.
-- NULL o vacío = comportamiento viejo (cada 7 días desde la fecha).
alter table tasks
  add column if not exists recurrence_days smallint[];
