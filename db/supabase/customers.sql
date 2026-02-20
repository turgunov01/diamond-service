-- Supabase SQL: таблица клиентов для HR

do $$
begin
  create type public.work_shift as enum ('day', 'night');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.customers (
  id bigint generated always as identity primary key,
  username text not null unique,
  avatar text not null,
  password text not null,
  phone_number text not null,
  passport_file text not null,
  age integer not null check (age >= 18),
  work_shift public.work_shift not null,
  object_pinned text not null,
  object_positions text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.customers
  add column if not exists base_salary bigint not null default 1000000;

alter table public.customers
  add column if not exists position_bonus bigint not null default 0;

alter table public.customers
  add column if not exists salary_currency text not null default 'UZS';

alter table public.customers enable row level security;

insert into storage.buckets (id, name, public)
values
  ('customer-avatars', 'customer-avatars', true),
  ('customer-passports', 'customer-passports', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Allow read for authenticated users" on public.customers;
drop policy if exists "Разрешить чтение авторизованным пользователям" on public.customers;
create policy "Разрешить чтение авторизованным пользователям"
on public.customers
for select
to authenticated
using (true);

drop policy if exists "Allow insert for authenticated users" on public.customers;
drop policy if exists "Разрешить добавление авторизованным пользователям" on public.customers;
create policy "Разрешить добавление авторизованным пользователям"
on public.customers
for insert
to authenticated
with check (true);

drop policy if exists "Allow update for authenticated users" on public.customers;
drop policy if exists "Разрешить обновление авторизованным пользователям" on public.customers;
create policy "Разрешить обновление авторизованным пользователям"
on public.customers
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow delete for authenticated users" on public.customers;
drop policy if exists "Разрешить удаление авторизованным пользователям" on public.customers;
create policy "Разрешить удаление авторизованным пользователям"
on public.customers
for delete
to authenticated
using (true);

insert into public.customers
  (username, avatar, password, phone_number, passport_file, age, work_shift, object_pinned, object_positions, base_salary, position_bonus, salary_currency)
values
  ('alex.smith', 'https://i.pravatar.cc/128?u=alex.smith', 'AxS!2026', '+1-202-555-0101', 'passports/alex-smith.pdf', 29, 'day', 'Корпус А', array['Второй этаж', 'Туалет 1', 'Туалет 2'], 1000000, 120000, 'UZS'),
  ('jordan.brown', 'https://i.pravatar.cc/128?u=jordan.brown', 'JbR#2045', '+1-202-555-0102', 'passports/jordan-brown.pdf', 34, 'night', 'Склад 2', array['Первый этаж', 'Зона погрузки', 'Склад 4'], 1000000, 150000, 'UZS'),
  ('taylor.green', 'https://i.pravatar.cc/128?u=taylor.green', 'TgX@9831', '+1-202-555-0103', 'passports/taylor-green.pdf', 27, 'day', 'Офисная башня', array['Второй этаж', 'Туалет 3', 'Коридор ресепшена'], 1000000, 90000, 'UZS'),
  ('morgan.white', 'https://i.pravatar.cc/128?u=morgan.white', 'Mw!1190', '+1-202-555-0104', 'passports/morgan-white.pdf', 31, 'night', 'ТЦ Север', array['Первый этаж', 'Туалет 1', 'Парковка B1'], 1000000, 110000, 'UZS'),
  ('casey.gray', 'https://i.pravatar.cc/128?u=casey.gray', 'Cg$5521', '+1-202-555-0105', 'passports/casey-gray.pdf', 25, 'day', 'Клиника Запад', array['Второй этаж', 'Коридор отделения', 'Туалет 2'], 1000000, 70000, 'UZS'),
  ('jamie.johnson', 'https://i.pravatar.cc/128?u=jamie.johnson', 'Jj%4433', '+1-202-555-0106', 'passports/jamie-johnson.pdf', 38, 'night', 'Отель Восток', array['5 этаж', 'Туалет 1', 'Аварийная лестница'], 1000000, 130000, 'UZS'),
  ('riley.davis', 'https://i.pravatar.cc/128?u=riley.davis', 'Rd*7845', '+1-202-555-0107', 'passports/riley-davis.pdf', 30, 'day', 'Заводская линия 1', array['Главный зал', 'Туалет 2', 'Зона C'], 1000000, 80000, 'UZS'),
  ('kelly.wilson', 'https://i.pravatar.cc/128?u=kelly.wilson', 'Kw&2201', '+1-202-555-0108', 'passports/kelly-wilson.pdf', 33, 'night', 'Школьный блок C', array['Второй этаж', 'Туалет 1', 'Крыло классов'], 1000000, 100000, 'UZS')
on conflict (username) do nothing;
