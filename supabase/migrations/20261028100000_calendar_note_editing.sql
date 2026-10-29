-- Run after 20261028090000_calendar_notes.sql in Supabase SQL Editor.
-- Only approved admins can edit or delete calendar notes.
-- The app exposes these actions only when Admin Mode is switched on.
-- Safe to rerun; existing notes, dates, authors, and timestamps are preserved.
begin;

revoke update, delete on table public.calendar_notes from public, anon, authenticated;
grant update (content) on table public.calendar_notes to authenticated;
grant delete on table public.calendar_notes to authenticated;

drop policy if exists "Admins can edit calendar notes" on public.calendar_notes;
create policy "Admins can edit calendar notes"
on public.calendar_notes for update to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Admins can delete calendar notes" on public.calendar_notes;
create policy "Admins can delete calendar notes"
on public.calendar_notes for delete to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and role = 'admin'));

notify pgrst, 'reload schema';
commit;
