-- Provider details retain the existing contacts table and organization column.
-- Organization is labelled Location in the app; appointment locations stay independent.
alter table public.contacts add column if not exists extension text;
