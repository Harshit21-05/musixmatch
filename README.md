# Song Radar 📡🇮🇳
> **Real-time Radar for Indian Song Announcements, Premieres & Live Releases**

Song Radar is a production-grade web application tracking Indian music announcements, scheduled premieres, and releases (including unannounced surprise drops) across **Telugu, Hindi, Tamil, Punjabi, Malayalam, Kannada, and Bengali**.

It serves as the live front-end for an automated intelligence scout that continuously monitors YouTube, Spotify, Apple Music, and social feeds, streaming discovered events into the platform via a secured, hardened Ingest API.

---

## 🏛️ Architecture & System Design

```mermaid
flowchart TD
    subgraph External_Automation["Autonomous Scouts & Crawlers"]
        Scout["AI Scout (Hourly / Always-on Worker)"]
    end

    subgraph Security_Gate["Hardened Ingest Layer"]
        BearerAuth["Bearer Token Auth (Constant-Time)"]
        RateLimit["Distributed Rate Limiter (Upstash / DB)"]
        ZodVal["Zod Schema & Dirty-Input Coercion"]
        Dedup["Dedup Key Engine (Transliteration-tolerant)"]
    end

    subgraph Database["Supabase Postgres 16"]
        Function["ingest_upsert_song_event (PL/pgSQL)"]
        UniqueConstraint[("UNIQUE(dedup_key) Constraint")]
        SongEvents[("song_events")]
        History[("event_history (Old -> New Audit)")]
        Sources[("event_sources (Provenance)")]
        Entities[("entities (Watchlist)")]
        Tasks[("tasks (Kanban Pipeline)")]
        Realtime["Supabase Realtime Channel"]
    end

    subgraph Client_App["Next.js 15 App Router (Vercel)"]
        ShellSwitch{"<ShellSwitch /> Breakpoint Cookie + UA"}
        Mobile["<MobileShell /> (<640px) Touch, Agenda, Sheets"]
        Desktop["<DesktopShell /> (>=1024px) Split-Pane, Kanban"]
        WallMode["<WallMode /> Full-screen Second-Screen Board"]
    end

    Scout -->|POST /api/ingest| BearerAuth
    BearerAuth --> RateLimit --> ZodVal --> Dedup
    Dedup -->|Single Transaction RPC| Function
    Function --> UniqueConstraint
    Function --> SongEvents
    Function --> History
    Function --> Sources
    SongEvents -.->|WebSocket Realtime + 30s Polling| Client_App
    Client_App --> ShellSwitch
    ShellSwitch --> Mobile
    ShellSwitch --> Desktop
    Client_App --> WallMode
```

---

## ⚠️ Important: Local Postgres (PGlite) Testing vs Live Supabase Production

> [!IMPORTANT]
> **Understanding the Boundary Between Local Function Logic and Supabase Production Role Security**
>
> 1. **What Local Tests Prove**:
>    - The local test suite (`scripts/test-real-postgres.js`, `scripts/verify-schema-security.js`) executes against **PGlite** (an embedded WebAssembly PostgreSQL 16 engine).
>    - These tests prove the mathematical correctness of database functions: single-transaction PL/pgSQL upsert semantics (`ingest_upsert_song_event`), row-level locks (`FOR UPDATE`), dedup key constraints, state ranking progression (never moving backwards), and sliding-window rate limit counters.
>
> 2. **What Must Be Applied & Verified in Live Supabase**:
>    - Supabase runs a managed multi-role PostgreSQL architecture (`authenticator`, `anon`, `authenticated`, `service_role`) paired with PostgREST.
>    - When PostgREST handles incoming requests with the public `anon` key, it checks whether `anon` has `EXECUTE` privileges on functions in `public`.
>    - Therefore, **Migration 3 (`supabase/migrations/20261026000003_secure_function_privileges.sql`) must be executed directly in your Supabase SQL Editor** (or applied via `supabase db push`).
>    - This ensures `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated` and `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated` take effect inside Supabase's live role hierarchy.
>    - Run the post-deployment smoke test (`node scripts/smoke-test-live.js --url <deployed-url>`) to confirm that PostgREST actively returns HTTP 401/403/404 when `anon` attempts to invoke sensitive RPC endpoints.

---

## 🔐 Supabase Row-Level Security (RLS) & Realtime Permissions

The frontend connects to Supabase using the public anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) to listen for real-time `INSERT` and `UPDATE` events via WebSocket on `public.song_events`.

Row-Level Security (RLS) is strictly enabled across **all 8 public tables**:

### Tables anon can `SELECT`:
| Table | Anon Access | Realtime Channel | Usage in Application |
|---|---|---|---|
| `public.song_events` | **SELECT only** | Enabled (`postgres_changes`) | Live feed, upcoming agenda, released catalog, and live drop flash alerts |
| `public.event_sources` | **SELECT only** | Disabled | Event source provenance links and first-seen audit timestamps |
| `public.event_history` | **SELECT only** | Disabled | State progression audit trail (`old_state -> new_state`) on `/events/[id]` |
| `public.entities` | **SELECT only** | Disabled | Watchlist directory of tracked movies, artists, and music labels |

### Tables with ZERO anon access (Restricted to `service_role`):
| Table | Anon Access | Access Mechanism | Purpose |
|---|---|---|---|
| `public.tasks` | **Blocked** | Server API (`/api/tasks`) via `service_role` + signed cookie | Personal 6-stage editorial Kanban workflow pipeline |
| `public.feedback` | **Blocked** | Server API (`/api/feedback`) via `service_role` + signed cookie | User reports for inaccurate alerts or corrections |
| `public.ingest_log` | **Blocked** | Server API (`/api/health`) via `service_role` + signed cookie | Scout crawler telemetry, error logs, and batch receipts |
| `public.rate_limits` | **Blocked** | Database RPC (`check_rate_limit`) via `service_role` | Shared sliding-window rate limit counters |

---

## 🔑 Authentication Architecture: Passcode vs. Session Cookie (`AUTH_SECRET`)

Song Radar enforces strict separation between human credentials and session tokens:

1. **`SONG_RADAR_PASSCODE`**:
   - The shared passphrase entered by human users in `/api/auth/verify` to authenticate.
   - Evaluated exclusively in constant time using `crypto.timingSafeEqual` to thwart timing attacks.

2. **`AUTH_SECRET` (Dedicated Cookie Signing Secret)**:
   - A high-entropy, server-only secret variable used solely to sign and verify the `song_radar_auth` `httpOnly` cookie using HMAC-SHA256.
   - Cookie format: `v1.<issuedAtMs>.<expiresAtMs>.<hmacSignature>`.
   - Token lifetime: **strictly 30 days** (`30 * 24 * 60 * 60 * 1000` ms).
   - Tamper-proof: Any alteration to payload timestamps or signature causes immediate rejection.
   - **Instant Session Invalidation on Secret Rotation**: If `AUTH_SECRET` is changed or rotated in environment variables, all outstanding client cookies are instantly rendered invalid upon next request.

---

## 📱 Capacitor Android APK Packaging (Same-Origin Cookie Auth)

When wrapping the application as an Android APK using Capacitor:
> [!IMPORTANT]
> **Capacitor must load the deployed production URL (`server.url`) rather than bundling local HTML assets.**
>
> In `capacitor.config.json`:
> ```json
> {
>   "appId": "com.songradar.app",
>   "appName": "Song Radar",
>   "webDir": "public",
>   "server": {
>     "url": "https://your-song-radar.vercel.app",
>     "cleartext": false
>   }
> }
> ```
> **Why?** Loading the deployed URL ensures that the signed `httpOnly` authentication cookie (`song_radar_auth`) set by `/api/auth/verify` remains strictly **same-origin** across all page navigations and API fetch calls. This eliminates third-party cookie blocking, CORS issues, or token sync problems inside the Android WebView.

---

## 🛠️ Environment Variables Configuration

Copy `.env.example` to `.env.local` for local development. Never commit `.env` files to git (`.gitignore` enforces this).

```env
# Human Passcode for Administrative Verification
SONG_RADAR_PASSCODE=songradar2026

# Server-Only HMAC Signing Secret for 30-Day Session Cookies (Change in Production)
AUTH_SECRET=auth-secret-song-radar-production-key-2026-very-secure

# Secret Bearer Token for External Automation Scouts
INGEST_TOKEN=songradar-secret-ingest-token-2026

# Supabase Postgres & Realtime Connection
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Shared Distributed Rate Limiting (Upstash Redis)
# If omitted, Song Radar automatically falls back to PostgreSQL rate_limits table
UPSTASH_REDIS_REST_URL=https://your-upstash-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxx...

# Optional: Direct PostgreSQL URL for Deep Catalog Inspection
DATABASE_URL=postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

---

## 🚀 Post-Deployment Smoke Test Script

Run `scripts/smoke-test-live.js` against your live deployment to verify security, RLS, token protection, and rate limits:

```bash
# Export secrets in your shell (secrets must NEVER be passed as CLI arguments):
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
export INGEST_TOKEN="songradar-secret-ingest-token-2026"
export SONG_RADAR_PASSCODE="songradar2026"
export AUTH_SECRET="your-auth-secret"

# 1. Run against deployed production URL:
node scripts/smoke-test-live.js --url https://your-song-radar.vercel.app

# 2. Or run against local server (requires explicit --allow-local flag):
node scripts/smoke-test-live.js --url http://localhost:3000 --allow-local
```

### Smoke Test Verifications:
1. **Public Function Anon Privilege Check**: Lists all public schema functions and proves `anon` has no execute privileges.
2. **PostgREST Anon RPC Denial**: Directly calls `${SUPABASE_URL}/rest/v1/rpc/ingest_upsert_song_event` with anon key to confirm HTTP 401/403/404 denial.
3. **Private Route Authentication**: Proves `/api/tasks`, `/api/events`, `/api/health`, `/api/feedback`, and `/api/ingest/entities` return HTTP 401 Unauthorized with `Cache-Control: no-store` when called without a valid signed cookie.
4. **Ingest Token Security**: Rejects wrong Bearer tokens with 401; accepts valid Bearer tokens with 200.
5. **Auth Verification Rate Limiting**: Triggers HTTP 429 Too Many Requests after 5 invalid passcode attempts.
6. **Webcal Calendar Feed Protection**: Rejects unauthenticated `/api/calendar.ics` requests with 401; returns valid `text/calendar` with token.

---

## 🧪 Automated Verification Suite

Run all test suites locally:

```bash
# 1. Postgres 16 Concurrency, Unique Constraints & Function Semantics
node scripts/test-real-postgres.js

# 2. Security Migration 3, ALTER DEFAULT PRIVILEGES & RLS Verification
node scripts/verify-schema-security.js

# 3. Auth Cookie Signing, 30-Day Expiry, Tamper Protection & Secret Rotation
node scripts/test-auth-cookie.js

# 4. Ingest API Security, Dirty-Input Coercion, State Invariance & Dedup
node scripts/test-ingest.js

# 5. Service-Role Server-Side Route Guard Authentication & Cache-Control
node scripts/test-route-auth.js

# 6. RFC 5545 Calendar Feed (CRLF, 75-octet folding, Sequence, Webcal)
node scripts/test-calendar-feed.js

# 7. Watchlist Entities Ingestion & Idempotency
node scripts/test-ingest-entities.js

# 8. PWA Service Worker, No-Cache Routing & Configurable API Client
node scripts/test-pwa-and-api.js

# 9. Verify Screenshot Entropy (Non-blank UI proof across 4 screen sizes)
node scripts/verify-screenshots.js

# 10. Clean Seed/Demo Data from Database
npm run db:clean-demo
```
