# Northstar — Personal Life OS

NORTHSTAR is a mobile-first PWA with daily planning, habits, weekly goals, reflection, themes, Supabase authentication and account-scoped cloud persistence.

## Stack
- Vite + vanilla JavaScript
- Supabase Auth (Google OAuth and email/password)
- Supabase Postgres with Row Level Security
- Vercel deployment

## Local development
1. Install Node.js 20 or newer.
2. Copy .env.example to .env.local and fill in the Supabase URL and publishable key.
3. Run:
   npm install
   npm run dev
4. Open the local Vite URL shown in the terminal.

## Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run supabase/schema.sql.
3. Go to Authentication → Providers → Google and enable Google.
4. Create an OAuth 2.0 Client ID in Google Cloud Console. Use the callback URL displayed by Supabase as the authorised redirect URI. Add the Client ID and Client Secret to Supabase, not to frontend environment variables.
5. In Supabase Authentication → URL Configuration, set the Vercel production URL as the Site URL and add the exact production and local development origins to the redirect allow list.
6. In Vercel → Project Settings → Environment Variables, configure:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY if using the legacy public anon key)
7. Redeploy after setting environment variables.

Never put the Google OAuth client secret or Supabase service-role key in Vite variables. VITE_ variables are bundled into browser code. The browser only receives the Supabase publishable/anon key; RLS is mandatory.

## Data and migration
- The first successful sign-in checks for an existing cloud snapshot.
- If an account has no cloud snapshot, the app imports a pre-existing V1 localStorage snapshot only when one exists and is not already claimed by another account.
- A genuinely new account with no legacy browser data starts with an empty application state.
- Existing local data is retained locally after migration. Export a JSON backup before the first sign-in as an extra precaution.
- After sign-in, the UI loads the account's appState from Supabase and debounces cloud saves. A local browser cache remains for responsiveness.
- New accounts start with a blank workspace: no seeded habits, priorities, weekly goals, daily schedule, or fitness targets. Users create their own structure.
- The current app state is stored as JSONB in user_preferences.preferences.appState. Relational tables provide a secure foundation for future structured feature storage; the frontend currently uses the JSONB snapshot.

## Security notes
- Supabase Auth handles identity and OAuth.
- RLS policies isolate all user-owned tables.
- HTTPS/TLS protects data in transit; Supabase-managed storage encryption at rest is relied on. This is not per-account end-to-end encryption. Client-side encryption/key recovery is not implemented.
- Keep the service-role key and Google OAuth client secret out of the browser and repository.
- Do not store banking passwords, card PINs or other credentials in NORTHSTAR.

## Current release scope
Included: Google and email/password authentication, password recovery, branded loading animation, cloud app-state fetch/save, one-time local snapshot migration, empty-by-default user-defined weekly goals, and the current V1 dashboard.
Not included: scheduled push reminders, automated weekly summaries, AI analysis, full offline write queue/conflict resolution, or client-side per-account encryption.
