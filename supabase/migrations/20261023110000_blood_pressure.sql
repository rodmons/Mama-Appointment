-- Run in Supabase SQL Editor for the existing Mama Mona project.
-- Requires the existing app_users table and private viewer/admin setup.
-- Both approved viewers and admins may log BP, without Admin Mode.
-- Safe to rerun. No example readings are inserted.
begin;

create table if not exists public.blood_pressure_readings (
  id uuid primary key default gen_random_uuid(),
  taken_at timestamptz not null,
  systolic integer not null check (systolic between 1 and 999),
  diastolic integer not null check (diastolic between 1 and 999),
  pulse integer not null check (pulse between 1 and 999),
  pill_timing text not null check (pill_timing in ('before', 'after')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists blood_pressure_taken_at_idx
  on public.blood_pressure_readings (taken_at desc, created_at desc);

alter table public.blood_pressure_readings enable row level security;
revoke all on table public.blood_pressure_readings from public, anon, authenticated;
grant select, insert on table public.blood_pressure_readings to authenticated;

drop policy if exists "Approved users can view BP" on public.blood_pressure_readings;
create policy "Approved users can view BP"
on public.blood_pressure_readings for select to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid())));

drop policy if exists "Approved users can log BP" on public.blood_pressure_readings;
create policy "Approved users can log BP"
on public.blood_pressure_readings for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.app_users where user_id = (select auth.uid()))
);

notify pgrst, 'reload schema';
commit;
