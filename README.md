# Mama Mona Appointments

A private appointment, provider, and medication organizer built with React, Vite, and Supabase.

## How access works

- Everyone must sign in.
- A `viewer` can see appointments, providers, and medications, and can add or edit any blood pressure reading in BP at any time.
- An `admin` starts in Mom Mode and must turn on Admin Mode to change appointments, providers, or medications. Logging BP does not require Admin Mode.
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
- For an existing database, run `supabase/migrations/20261023093000_provider_map_url.sql` in Supabase SQL Editor before deploying this update. It adds the optional provider map URL and extension columns without changing existing records or access rules, and is safe if the extension column already exists.
- Provider Location keeps using the existing `contacts.organization` column. Each appointment's Location uses `appointments.location_name` independently.
- Location links use the selected provider's map URL first, then the appointment's map URL, then a Google Maps search for the appointment address or location.

## MEDS database update

For the existing Supabase project, run **`supabase/migrations/20261023100000_medications.sql`** in **Supabase → SQL Editor**, then reopen MEDS. This file is safe to rerun. It requires the existing `contacts` and `app_users` tables and private access setup above. It does not change appointment or provider records or insert example medications.

The migration adds `medications`, optional provider links (with a recorded-name fallback), indexes, an updated timestamp trigger, and RLS. Approved viewers can read; only admins can create, edit, or delete. The app also requires Admin Mode to expose editing controls. A missing migration shows an actionable error inside MEDS without blocking the other sections.

MEDS groups records alphabetically by status, then name. Each compact row shows name, dosage, purpose, and More Info. Long summaries use an ellipsis and remain available in full through More Info. Optional fields remain blank unless entered. In Demo Mode only, medications are saved to this browser's local storage and start empty. Reset Demo clears these local medication records too. With Supabase configured, medication records use the authenticated database and are not copied into local storage.

For a brand-new project, run `schema.sql`, `rls-policies.sql`, and then this MEDS migration before using the app.

## BP database update

Run **[`supabase/migrations/20261023110000_blood_pressure.sql`](supabase/migrations/20261023110000_blood_pressure.sql)** in **Supabase → SQL Editor**, then reopen BP. It requires the existing `app_users` table and private access setup. It is safe to rerun and leaves appointments, providers, and medications unchanged.

The migration creates `blood_pressure_readings` and its index and RLS policies. Both approved viewers and admins can read and insert readings; Admin Mode is not required. Unapproved and signed-out users cannot access readings. Each reading records its signed-in author automatically. Editing requires the additional migration below; deletions remain unavailable.

BP records date and time, systolic, diastolic, pulse, and a Before pills / After pills dropdown. Readings appear in rows with the most recent measurement first. Times are entered and displayed in the device's local time and stored as timestamps with a time zone. Numeric values must be whole numbers from 1 to 999; this is input validation, not a medical assessment.

In Demo Mode, BP starts empty and saves only to this browser; Reset Demo clears these readings. With Supabase configured, readings are stored only in the authenticated database. Missing SQL shows a retryable error within BP.

### BP editing and averages update

After the original BP migration, run **[`supabase/migrations/20261023120000_blood_pressure_editing.sql`](supabase/migrations/20261023120000_blood_pressure_editing.sql)** in **Supabase → SQL Editor**. It is safe to rerun. All approved viewers and admins can edit any existing reading, including another user's reading, without Admin Mode. Only the five reading fields can change; the original ID, author, and creation timestamp remain protected. Existing readings are preserved.

The header automatically shows average systolic, diastolic, and pulse across every logged reading, rounded to at most one decimal place, with the total log count. BP fetches all result pages to include logs beyond Supabase's default row limit. Averages recalculate after adds and edits and require no SQL calculation or stored average fields.

## Checks

```powershell
npm test
npm run lint
npm run build
```
