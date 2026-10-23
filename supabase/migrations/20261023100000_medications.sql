-- Run this file in Supabase SQL Editor for the existing Mama Mona project.
-- Requires the existing contacts and app_users tables and viewer/admin setup.
-- No example medications are inserted; existing tables and policies are preserved.
begin;

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  status text not null check (status in ('active', 'on_hold', 'completed', 'discontinued')),
  medication_form text,
  start_date date,
  dosage text,
  frequency text,
  reason text,
  provider_id uuid references public.contacts(id) on delete set null,
  -- Retain the recorded name if a provider is removed. Also supports manual entry.
  prescribing_doctor text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medications_status_name_idx on public.medications (status, lower(name));
create index if not exists medications_provider_id_idx on public.medications (provider_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at before update on public.medications
for each row execute function public.set_updated_at();

alter table public.medications enable row level security;
revoke all on table public.medications from public, anon, authenticated;
grant select, insert, update, delete on table public.medications to authenticated;

drop policy if exists "Approved users can view medications" on public.medications;
create policy "Approved users can view medications"
on public.medications for select to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid())));

drop policy if exists "Admins can insert medications" on public.medications;
create policy "Admins can insert medications"
on public.medications for insert to authenticated
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can update medications" on public.medications;
create policy "Admins can update medications"
on public.medications for update to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can delete medications" on public.medications;
create policy "Admins can delete medications"
on public.medications for delete to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

notify pgrst, 'reload schema';
commit;
