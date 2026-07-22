-- ═══════════════════════════════════════════════════════
-- Migración: tabla push_subscriptions (notificaciones PWA)
-- Correr en: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  endpoint     text unique not null,
  p256dh       text not null,
  auth         text not null,
  user_email   text,
  label        text,
  topics       text[] default '{"general"}',
  last_used_at timestamptz default now(),
  created_at   timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Solo el service role (backend) puede leer/escribir; el frontend solo inserta vía API.
create policy "push_subs_service_only" on push_subscriptions
  for all using (false) with check (false);
