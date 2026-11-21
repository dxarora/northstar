# Northstar — Personal Life OS (V1)

A mobile-first, installable personal dashboard for daily priorities, a weekly planner, habits, reflection, and preferences.

## Run locally

This is a static PWA and needs no build step. From this folder run:

```bash
python3 -m http.server 3000
```

Open http://localhost:3000. (Service worker/PWA installation requires localhost or HTTPS.)

## Deploy to Vercel

1. Create a GitHub repository and upload the contents of this folder (not the containing folder itself).
2. Import the repository into Vercel.
3. Select **Other** as the framework preset if prompted. No build command is required; set the output directory to `.`.
4. Deploy.
5. Open the HTTPS deployment on Android Chrome and choose **Add to Home screen** / **Install app**.

## V1 features

- Today dashboard with editable top-three priorities
- Personal daily schedule based on configurable wake, work and bedtime settings
- Daily habit checklist and completion indicators
- Monday-start weekly planner and editable weekly goals
- Daily reflection, intention and mood check-in
- Light/dark theme
- Local browser persistence, offline shell caching and JSON backup export
- Responsive mobile and desktop layouts

## Important limitations

- Data is stored in localStorage in the current browser/device. It is not cloud-synced, encrypted at rest by this app, or shared across devices.
- Browser notifications are not enabled in V1. The current automation is in-app progress calculation and a cached offline shell, not scheduled push reminders.
- No financial account credentials or sensitive banking information should be entered.
- V1 is a personal prototype, not a medical or financial advice product.

## Next release

Add Supabase authentication and row-level-security-protected cloud sync, then optional reminder scheduling and dedicated fitness, career, finance and project modules.
