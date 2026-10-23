-- Run in Supabase SQL Editor after 20261023110000_blood_pressure.sql.
-- All approved viewers and admins can edit any logged BP, without Admin Mode.
-- Safe to rerun. Existing readings and their original authors are preserved.
begin;

revoke update on table public.blood_pressure_readings from public, anon, authenticated;
grant update (taken_at, systolic, diastolic, pulse, pill_timing)
  on table public.blood_pressure_readings to authenticated;

drop policy if exists "Approved users can edit BP" on public.blood_pressure_readings;
create policy "Approved users can edit BP"
on public.blood_pressure_readings for update to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid())));

notify pgrst, 'reload schema';
commit;
