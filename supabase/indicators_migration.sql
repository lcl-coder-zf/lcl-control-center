create table if not exists public.indicators (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  responsable_id uuid references public.profiles(id) on delete set null,
  company_id    uuid references public.companies(id) on delete set null,
  frequency     text check (frequency in ('semanal', 'quincenal', 'mensual', 'trimestral', 'anual')),
  due_date      date not null,
  status        text not null default 'pendiente' check (status in ('pendiente', 'entregado')),
  notas         text,
  created_at    timestamptz not null default now()
);

alter table public.indicators enable row level security;

create policy "Authenticated users can manage indicators"
  on public.indicators for all
  to authenticated
  using (true)
  with check (true);
