-- Extend profiles with HR fields
alter table public.profiles
  add column if not exists bio        text,
  add column if not exists start_date date,
  add column if not exists phone      text;

-- Evaluaciones de desempeño
create table if not exists public.evaluaciones (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  date        date not null default current_date,
  score       integer check (score between 1 and 5),
  notas       text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
alter table public.evaluaciones enable row level security;
create policy "Admins manage evaluaciones"
  on public.evaluaciones for all to authenticated
  using   (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Own evaluaciones readable"
  on public.evaluaciones for select to authenticated
  using (profile_id = auth.uid());

-- Llamados de atención
create table if not exists public.llamados_atencion (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  date        date not null default current_date,
  motivo      text not null,
  descripcion text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
alter table public.llamados_atencion enable row level security;
create policy "Admins manage llamados"
  on public.llamados_atencion for all to authenticated
  using   (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
