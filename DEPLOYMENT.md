# Production Deployment Guide: GitHub to Vercel (Hobby) + Supabase

This guide outlines the complete step-by-step procedure to deploy **Song Radar** to production on **Vercel** connected to **Supabase** (Postgres 16 + Realtime).

---

## 📋 Pre-Deployment Checklist

- [x] Next.js 15 App Router with zero client-side leaks of service-role keys.
- [x] Supabase Row-Level Security (RLS) configured:
  - Anon has `SELECT` permission **only** on `song_events`, `event_sources`, `event_history`, and `entities`.
  - `tasks`, `feedback`, `ingest_log`, and `rate_limits` are strictly protected (`service_role` access only).
- [x] DB-level UNIQUE constraint on `dedup_key` with atomic PL/pgSQL upsert function.
- [x] PWA manifest and service worker in `public/`.
- [x] Configurable `NEXT_PUBLIC_API_BASE` for Capacitor Android APK build.

---

## Step 1: Set Up Supabase Project

1. Navigate to [Supabase Console](https://supabase.com/dashboard) and create a new project.
2. Choose a region closest to your target audience (e.g. `ap-south-1` Mumbai).
3. Open the **SQL Editor** in your Supabase dashboard and run the migrations in order:

### 1.1 Run Migration 0 (Schema & Tables)
Execute the contents of:
```sql
supabase/migrations/20261026000000_init_song_radar.sql
```
This creates:
- `song_events` with `dedup_key TEXT UNIQUE NOT NULL`, `date_time_ist TIMESTAMPTZ`, and `is_demo BOOLEAN`.
- `event_sources`, `event_history`, `entities`, `tasks`, `feedback`, `ingest_log`, `rate_limits`.
- Full Row-Level Security (RLS) policies.

### 1.2 Run Migration 1 (Seed Demo Data - Optional)
Execute the contents of:
```sql
supabase/migrations/20261026000001_seed_song_radar.sql
```
*Note: All seed records have `is_demo = true`. They can be purged anytime by running `node scripts/clean-demo.js` or `DELETE FROM song_events WHERE is_demo = true;`.*

### 1.3 Run Migration 2 (Atomic PL/pgSQL Function & Rate Limits)
Execute the contents of:
```sql
supabase/migrations/20261026000002_ingest_upsert_function.sql
```
This deploys:
- `ingest_upsert_song_event(...)`: Atomic row-level locked upsert function preventing concurrency race conditions, enforcing state progression rank, and logging mutation diffs into `event_history`.
- `check_rate_limit(...)`: Database-level distributed rate limiter counter.

### 1.4 Enable Supabase Realtime
1. In the Supabase dashboard, navigate to **Database** -> **Replication**.
2. Enable replication for the `public.song_events` table.

---

## Step 2: Deploy to Vercel

1. Push your repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
3. Import your GitHub repository `song-radar`.
4. Configure the Framework Preset: **Next.js**.
5. Add the following **Environment Variables** in the Vercel project settings:

| Variable Name | Environment | Value Description |
|---|---|---|
| `SONG_RADAR_PASSCODE` | Production, Preview | Shared secret passcode for user access (e.g. `songradar2026`) |
| `INGEST_TOKEN` | Production, Preview | Secret Bearer token used by external automation scouts |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Your Supabase Project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Supabase Public Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | **Server-only** Supabase Service Role Key (Keep Private) |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis REST URL (if using external Redis rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis REST Token |
| `NEXT_PUBLIC_API_BASE` | Optional | Leave blank for Vercel web deployment |

6. Click **Deploy**. Vercel will build and deploy the application on the Hobby plan.

---

## Step 3: Verify the Live Production Deployment

### 3.1 Verify Access Gate
Visit your deployed domain: `https://your-song-radar.vercel.app`.
- If not authenticated, you will be prompted for the passcode.
- Enter the value configured in `SONG_RADAR_PASSCODE`.

### 3.2 Verify Ingest API
Send a test song announcement via `curl`:
```bash
curl -X POST https://your-song-radar.vercel.app/api/ingest \
  -H "Authorization: Bearer <INGEST_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "song_title": "Production Test Track",
    "movie_or_artist": "Pushpa 2: The Rule",
    "language": "Telugu",
    "state": "scheduled",
    "date_time_ist": "2026-11-01T10:00:00+05:30",
    "singers": ["Devi Sri Prasad"],
    "music_director": "Devi Sri Prasad",
    "confidence": "high"
  }'
```
Expected response:
```json
{
  "success": true,
  "created": 1,
  "updated": 0,
  "ignored": 0,
  "total": 1
}
```
Instantly check your browser window: Supabase Realtime will push the new card with a red flash animation!

### 3.3 Verify Webcal Subscription Feed
Subscribe in Apple Calendar, Google Calendar, or Thunderbird:
```
webcal://your-song-radar.vercel.app/api/calendar.ics?token=<INGEST_TOKEN>
```
All release times will show in local time with 30-minute reminder alarms.

---

## Step 4: Wrapping for Android APK (Capacitor)

When ready to package the site into an Android APK:
1. Initialize Capacitor in the repo:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Song Radar" "com.songradar.app" --web-dir "public"
   ```
2. In `capacitor.config.json`, configure the remote server URL pointing to your production Vercel deployment:
   ```json
   {
     "appId": "com.songradar.app",
     "appName": "Song Radar",
     "webDir": "public",
     "server": {
       "url": "https://your-song-radar.vercel.app",
       "cleartext": false
     }
   }
   ```
3. Set `NEXT_PUBLIC_API_BASE=https://your-song-radar.vercel.app` in your Vercel project environment.
4. Add the Android platform:
   ```bash
   npx cap add android
   npx cap open android
   ```
5. In Android Studio, build signed APK or bundle for Google Play.
