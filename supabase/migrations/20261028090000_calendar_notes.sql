-- Run in Supabase SQL Editor for the existing Mama Mona project.
-- Requires public.app_users and the existing private viewer/admin access setup.
-- Approved viewers and admins can add notes without switching to Admin Mode.
-- Safe to rerun. No example notes are inserted.
begin;

create table if not exists public.calendar_notes (
  id uuid primary key default gen_random_uuid(),
  note_date date not null,
  content text not null check (length(btrim(content, E' \t\n\r')) > 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists calendar_notes_date_idx
  on public.calendar_notes (note_date, created_at, id);

alter table public.calendar_notes enable row level security;
revoke all on table public.calendar_notes from public, anon, authenticated;
grant select on table public.calendar_notes to authenticated;
grant insert (note_date, content) on table public.calendar_notes to authenticated;

drop policy if exists "Approved users can view calendar notes" on public.calendar_notes;
create policy "Approved users can view calendar notes"
on public.calendar_notes for select to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid())));

drop policy if exists "Approved users can add calendar notes" on public.calendar_notes;
create policy "Approved users can add calendar notes"
on public.calendar_notes for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.app_users where user_id = (select auth.uid()))
);

notify pgrst, 'reload schema';
commit;
