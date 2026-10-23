-- Safe for projects that have not applied the earlier extension migration yet.
alter table public.contacts
  add column if not exists extension text,
  add column if not exists maps_url text;

notify pgrst, 'reload schema';
