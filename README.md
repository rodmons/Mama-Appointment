# Mama Mona Appointments

Mama Mona Appointments is a calm, mobile-first appointment calendar for an older adult and her caregiver. It opens directly in a safe, read-only **Mom Mode**, with a separate authenticated **Admin Mode** for maintaining appointments and care providers.

The app is intentionally focused on appointment logistics—not medical records. It is built as a small React single-page app that can run with local demo data, connect to Supabase, install as a PWA, and deploy to GitHub Pages.

## What is included

- Time-aware greeting and a prominent next-appointment card
- Human-friendly date labels such as Today, Tomorrow, and In 2 weeks
- Upcoming appointments and collapsible past history
- Mobile monthly calendar with appointment indicators and day agendas
- Appointment details with provider, specialty, address, Maps, clinic calling, notes, and things to bring
- Read-only doctors directory in Mom Mode
- Admin-only add, edit, cancel, and delete controls
- Searchable doctor selector with inline Add New Doctor flow
- Form validation for required fields and invalid time ranges
- Local browser persistence and sample data when Supabase is not configured
- Supabase database, authentication, and data-service integration
- Installable PWA with static asset caching
- GitHub Pages-compatible relative asset paths and deployment workflow
- Calm empty, loading, offline, and error states

## Technology

- React 19 + TypeScript
- Vite 8
- Plain responsive CSS
- Supabase JavaScript client
- `vite-plugin-pwa` / Workbox
- Oxlint

No custom backend, router, large UI framework, Redux, or mapping library is used.

## Run locally

Requirements: Node.js 22 or newer and npm.

```powershell
cd "$HOME\Desktop\mama-mona-appointments"
npm install
npm run dev
```

Open the local URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

Other useful commands:

```powershell
npm run lint
npm run build
npm run preview
```

## Demo/local mode

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent, the app starts in clearly labeled **Demo mode**. Sample doctors and appointments are loaded from `src/data/demoData.ts`, including the Audiogram appointment on August 11, 2026.

Changes made in Demo mode are saved to the current browser's `localStorage`. Open **Settings** to use the development-only Local Admin Mode toggle or reset the samples. This toggle is not available once Supabase credentials are configured.

To remove demo data later, replace or delete the exported arrays in `src/data/demoData.ts`. Production Supabase data never uses those arrays.

## Connect Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run `supabase/schema.sql`.
3. Review the privacy trade-off below, then run `supabase/rls-policies.sql` or your stricter policies.
4. In **Authentication → Users**, create the trusted admin account. Disable public sign-ups unless they are deliberately required.
5. Copy `.env.example` to `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

6. In **Project Settings → API**, copy the project URL and anon/publishable key into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

7. Restart `npm run dev`.

Never put the service-role key in this frontend. The anon key is designed for browser use, but its permissions must be restricted with Row Level Security.

## Database model

### `doctors`

`id`, `name`, `specialty`, `hospital`, `phone`, `notes`, `created_at`, `updated_at`

### `appointments`

`id`, `date`, `start_time`, `end_time`, `purpose`, `doctor_id`, `location_name`, `address`, `phone`, `maps_url`, `notes`, `things_to_bring`, `status`, `created_at`, `updated_at`

`doctor_id` references `doctors.id`, and the status constraint allows `confirmed`, `tentative`, `cancelled`, or `completed`. The schema includes date/provider/status indexes, an end-time check, and automatic `updated_at` triggers.

Locations are represented by reusable-friendly fields so a later version can move them into a separate `locations` table without redesigning appointment details.

## Authentication and RLS

Mom Mode requires no login. Admin Mode uses Supabase email/password Auth, and all editing controls remain absent until a valid session exists.

There is an unavoidable privacy trade-off: **a no-login Mom Mode backed directly by Supabase requires anonymous read policies**. Anyone who can discover the public GitHub Pages app can make the same read request. The starter policies therefore allow anonymous reads but authenticated writes, and assume the Supabase project contains only trusted admin accounts.

Before storing real appointment logistics:

- Keep data minimal—purpose, time, location, preparation reminders.
- Do not store PHN, SIN, insurance numbers, passwords, detailed diagnoses, test results, or medical records.
- Disable unneeded Supabase sign-up methods.
- Keep the admin account protected with a strong unique password and MFA when available.
- For multiple authenticated users, add an `app_metadata.role = admin` check or an explicit administrators table to every write policy.

For a privacy-first deployment, remove the two anonymous SELECT policies and require authentication for reading. That changes the product requirement: Mom would need a persistent sign-in or another trusted access layer. GitHub Pages cannot safely hold a secret shared password or service-role key.

## Production build

```powershell
npm ci
npm run lint
npm run build
```

The static output is written to `dist/`. Vite uses `base: './'`, so assets work from both a custom domain and a GitHub repository subpath. The app uses internal view state rather than history routes, avoiding GitHub Pages refresh/404 problems.

## Deploy to GitHub Pages

No GitHub repository is created or pushed automatically.

1. Create an empty GitHub repository and push this local repository to its `main` branch.
2. In the GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Push to `main`, or run the **Deploy to GitHub Pages** workflow manually.
5. If using Supabase, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the workflow through GitHub Actions variables/secrets and expose them in the build step. Do not add `.env` to Git.

The included workflow at `.github/workflows/deploy-pages.yml` installs, lints, builds, and deploys `dist/`.

## Install on a phone

The PWA must be served over HTTPS (GitHub Pages provides this).

### iPhone / iPad

1. Open the deployed app in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Confirm **Add**.

### Android

1. Open the deployed app in Chrome.
2. Open the browser menu.
3. Choose **Install app** or **Add to Home screen**.

The installed app uses standalone display mode and caches its static interface. Supabase updates still require a connection; the app shows a plain-language offline notice when disconnected.

## Project structure

```text
src/
  components/     shared calendar, card, detail, form, and layout UI
  data/           removable local demo data
  pages/          Home, Doctors, and Settings views
  services/       Supabase setup and local/Supabase data abstraction
  styles/         responsive design system
  types/          shared domain types
  utils/          local-safe date and time formatting
supabase/
  schema.sql
  rls-policies.sql
.github/workflows/
  deploy-pages.yml
```

## Security boundary

This project is an appointment organizer, not an electronic medical record. A static site cannot conceal bundled secrets. Keep authentication secrets out of source control, rely on Supabase Auth and RLS for writes, and treat anonymous-read data as public. Review the RLS policies and privacy model before adding real data.
