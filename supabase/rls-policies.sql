-- Mama Mona Appointments: recommended starter RLS policies
-- IMPORTANT: no-login Mom Mode requires anonymous SELECT access. That means
-- anyone with the deployed URL can read the appointment logistics stored here.
-- Keep the data minimal. See README.md for the privacy-first alternative.

drop policy if exists "Public can view doctors" on public.doctors;
create policy "Public can view doctors"
on public.doctors for select
to anon, authenticated
using (true);

drop policy if exists "Public can view appointments" on public.appointments;
create policy "Public can view appointments"
on public.appointments for select
to anon, authenticated
using (true);

-- Use Supabase Auth only for trusted admin accounts. For a multi-user project,
-- replace these policies with a verified app_metadata role or an admin table.
drop policy if exists "Authenticated admins can insert doctors" on public.doctors;
create policy "Authenticated admins can insert doctors"
on public.doctors for insert to authenticated with check (true);

drop policy if exists "Authenticated admins can update doctors" on public.doctors;
create policy "Authenticated admins can update doctors"
on public.doctors for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated admins can delete doctors" on public.doctors;
create policy "Authenticated admins can delete doctors"
on public.doctors for delete to authenticated using (true);

drop policy if exists "Authenticated admins can insert appointments" on public.appointments;
create policy "Authenticated admins can insert appointments"
on public.appointments for insert to authenticated with check (true);

drop policy if exists "Authenticated admins can update appointments" on public.appointments;
create policy "Authenticated admins can update appointments"
on public.appointments for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated admins can delete appointments" on public.appointments;
create policy "Authenticated admins can delete appointments"
on public.appointments for delete to authenticated using (true);

-- Privacy-first alternative (requires changing Mom Mode to sign in):
-- 1. Drop the two Public can view policies above.
-- 2. Create SELECT policies for role authenticated only.
-- 3. Add an app_metadata role check to write policies, for example:
--    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
