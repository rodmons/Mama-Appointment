-- Mama Mona Appointments: canonical Supabase/Postgres schema
-- For a brand-new project. Existing projects should run rls-policies.sql after
-- completing the doctors-to-contacts migration described in README.md.

create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  contact_type text not null default 'other' check (contact_type in ('doctor', 'nurse', 'clinic', 'hospital', 'pharmacy', 'personal', 'transportation', 'other')),
  role_or_specialty text,
  organization text,
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
  contact_id uuid references public.contacts(id) on delete set null,
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

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists appointments_date_start_idx on public.appointments (date, start_time);
create index if not exists appointments_contact_id_idx on public.appointments (contact_id);
create index if not exists appointments_status_idx on public.appointments (status);
create index if not exists contacts_name_idx on public.contacts (lower(name));

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();
drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;
alter table public.appointments enable row level security;
alter table public.app_users enable row level security;

-- Continue with supabase/rls-policies.sql before connecting the web app.
