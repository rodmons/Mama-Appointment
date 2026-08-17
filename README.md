# Mama Mona Appointments

A private appointment and contact organizer built with React, Vite, and Supabase.

## How access works

- Everyone must sign in.
- A `viewer` can see appointments and contacts, but cannot change them.
- An `admin` starts in read-only Mom Mode and must turn on Admin Mode before editing.
- Supabase Row Level Security (RLS) enforces these permissions in the database. Hiding buttons alone is not the security system.

Never put a Supabase `service_role` or secret key in this app, GitHub, or a browser. The app only needs the project URL and publishable key. The publishable key is designed to be visible; RLS protects the data.

## Run locally

```powershell
npm install
npm run dev
```

Open the local address printed in the terminal, normally `http://localhost:5173`.

Without a `.env` file the app runs in Demo Mode and stores sample data only in that browser.

## Connect the existing Supabase project

Your database already has `contacts` and `appointments`, so do not run `schema.sql` again.

1. In Supabase, open **SQL Editor**.
2. Copy and run [`supabase/rls-policies.sql`](supabase/rls-policies.sql). This creates the private access list and enables the viewer/admin rules.
3. Open **Authentication → Users** and create the two accounts you want to use. Turn on auto-confirm if Supabase offers that option.
4. Copy each user's UUID.
5. In SQL Editor, add the users to the access list, replacing the example UUIDs:

```sql
insert into public.app_users (user_id, display_name, role)
values
  ('YOUR-ADMIN-USER-UUID', 'Rodmon', 'admin'),
  ('YOUR-VIEWER-USER-UUID', 'Mama', 'viewer');
```

6. Copy `.env.example` to a new file named `.env`.
7. In Supabase, open **Project Settings → API** and copy the Project URL and publishable key into `.env`:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
```

8. Stop and restart `npm run dev`, then sign in with one of the accounts you created.

Supabase and GitHub do not need to be directly connected. The app connects to Supabase through those two values.

## GitHub Pages

The deployment workflow reads the same two values from GitHub repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Add them under **GitHub repository → Settings → Secrets and variables → Actions → Variables**. These are not passwords, but the RLS policies must be installed before publishing them.

## Database files

- `supabase/schema.sql` describes a brand-new database.
- `supabase/rls-policies.sql` upgrades the existing project with private viewer/admin access.

## Checks

```powershell
npm test
npm run lint
npm run build
```
