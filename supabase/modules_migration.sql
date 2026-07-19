-- Add document field to profiles
alter table public.profiles
  add column if not exists document_id text;

-- App-wide module settings (key = module name, value = 'all' | 'admin')
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null default 'all',
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "Anyone authenticated can read settings"
  on public.app_settings for select to authenticated using (true);
create policy "Only admins can write settings"
  on public.app_settings for all to authenticated
  using   (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Default module visibility
insert into public.app_settings (key, value) values
  ('module_clientes',      'all'),
  ('module_tareas',        'all'),
  ('module_agenda',        'all'),
  ('module_equipo',        'all'),
  ('module_vault',         'admin'),
  ('module_configuracion', 'admin')
on conflict (key) do nothing;
