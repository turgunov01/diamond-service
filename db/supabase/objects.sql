-- Supabase SQL: таблица объектов/зон для управления зонами

create table if not exists public.objects (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.objects enable row level security;

drop policy if exists "Allow read for authenticated users" on public.objects;
create policy "Allow read for authenticated users"
on public.objects
for select
to authenticated
using (true);

drop policy if exists "Allow insert for authenticated users" on public.objects;
create policy "Allow insert for authenticated users"
on public.objects
for insert
to authenticated
with check (true);

drop policy if exists "Allow update for authenticated users" on public.objects;
create policy "Allow update for authenticated users"
on public.objects
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow delete for authenticated users" on public.objects;
create policy "Allow delete for authenticated users"
on public.objects
for delete
to authenticated
using (true);

-- Insert sample zones/objects data
insert into public.objects (name, description)
values
  ('Корпус А', 'Основное здание'),
  ('Склад 2', 'Складское помещение 2'),
  ('Офисная башня', 'Офисный центр'),
  ('ТЦ Север', 'Торговый центр Север'),
  ('Клиника Запад', 'Медицинское учреждение'),
  ('Отель Восток', 'Гостиница'),
  ('Заводская линия 1', 'Производственная линия 1'),
  ('Школьный блок C', 'Образовательное учреждение')
on conflict (name) do nothing;
