-- ═══════════════════════════════════════════════════════
-- Migración: agregar start_time / end_time a schedule_entries
-- Correr en: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════

alter table schedule_entries
  add column if not exists start_time time,
  add column if not exists end_time   time;
