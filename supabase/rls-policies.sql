-- Mama Mona Appointments: private viewer/admin access policies
-- Safe to run after the existing doctors table has been migrated to contacts.

begin;

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
alter table public.appointments enable row level security;
alter table public.app_users enable row level security;

-- No unauthenticated visitor can reach any private table.
revoke all on table public.contacts from anon;
revoke all on table public.appointments from anon;
revoke all on table public.app_users from anon;

grant select on table public.contacts to authenticated;
grant select on table public.appointments to authenticated;
grant select on table public.app_users to authenticated;
grant insert, update, delete on table public.contacts to authenticated;
grant insert, update, delete on table public.appointments to authenticated;

-- Remove policies from the earlier public prototype if they were ever applied.
drop policy if exists "Public can view doctors" on public.contacts;
drop policy if exists "Public can view appointments" on public.appointments;
drop policy if exists "Authenticated admins can insert doctors" on public.contacts;
drop policy if exists "Authenticated admins can update doctors" on public.contacts;
drop policy if exists "Authenticated admins can delete doctors" on public.contacts;
drop policy if exists "Authenticated admins can insert appointments" on public.appointments;
drop policy if exists "Authenticated admins can update appointments" on public.appointments;
drop policy if exists "Authenticated admins can delete appointments" on public.appointments;

drop policy if exists "Users can read own access role" on public.app_users;
create policy "Users can read own access role"
on public.app_users for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Approved users can view contacts" on public.contacts;
create policy "Approved users can view contacts"
on public.contacts for select to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid())));

drop policy if exists "Approved users can view appointments" on public.appointments;
create policy "Approved users can view appointments"
on public.appointments for select to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid())));

drop policy if exists "Admins can insert contacts" on public.contacts;
create policy "Admins can insert contacts"
on public.contacts for insert to authenticated
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can update contacts" on public.contacts;
create policy "Admins can update contacts"
on public.contacts for update to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can delete contacts" on public.contacts;
create policy "Admins can delete contacts"
on public.contacts for delete to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can insert appointments" on public.appointments;
create policy "Admins can insert appointments"
on public.appointments for insert to authenticated
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can update appointments" on public.appointments;
create policy "Admins can update appointments"
on public.appointments for update to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can delete appointments" on public.appointments;
create policy "Admins can delete appointments"
on public.appointments for delete to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

commit;
