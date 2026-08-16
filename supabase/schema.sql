-- Mama Mona Appointments: initial Supabase/Postgres schema
-- Run in a new Supabase project's SQL Editor. This script is additive and does
-- not drop existing tables or data.

create extension if not exists pgcrypto;

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  specialty text not null check (char_length(trim(specialty)) > 0),
  hospital text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time,
  purpose text not null check (char_length(trim(purpose)) > 0),
  doctor_id uuid references public.doctors(id) on delete set null,
  location_name text,
  address text,
  phone text,
  maps_url text,
  notes text,
  things_to_bring text[] not null default '{}',
  status text not null default 'confirmed' check (status in ('confirmed', 'tentative', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_times_valid check (end_time is null or end_time >= start_time)
);

create index if not exists appointments_date_start_idx on public.appointments (date, start_time);
create index if not exists appointments_doctor_id_idx on public.appointments (doctor_id);
create index if not exists appointments_status_idx on public.appointments (status);
create index if not exists doctors_name_idx on public.doctors (lower(name));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists doctors_set_updated_at on public.doctors;
create trigger doctors_set_updated_at before update on public.doctors
for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

alter table public.doctors enable row level security;
alter table public.appointments enable row level security;

-- Policies are intentionally separated so the privacy model is an explicit
-- deployment choice. Continue with supabase/rls-policies.sql.
