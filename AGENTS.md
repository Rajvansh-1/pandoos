# PANDOOS — IDE CONTEXT FILE (Dont read this , I have dropped this idea as this is not feasible)
# Read this first before doing ANYTHING in this codebase.
# This file is the single source of truth for the entire Pandoos ecosystem.

---

## 🐼 What is Pandoos?

Pandoos is a **premium music streaming ecosystem** — not just an app.
It uses **YouTube Music as its audio backend** (via InnerTube private API + ytdl-core),
**Supabase as its cloud backend** (auth, playlists, sync), and targets three platforms:

| Platform | Repo | Stack | Status |
|---|---|---|---|
| Web + Desktop | `pandoos/` (THIS REPO) | Vite + React + Electron | ✅ Active |
| Android | `pandoos-android/` (SEPARATE REPO) | Kotlin + Jetpack Compose + Media3 | 🚧 In Progress |
| iOS | — | SwiftUI (future) | 📅 Planned |

The Android app is a **fork of SimpMusic** (`maxrave-dev/SimpMusic`, GPL-3.0),
rebranded and extended with Pandoos identity + Supabase sync.

---

## 🗂️ THIS REPO — Web + Desktop (`pandoos/`)

### Root Structure
```
pandoos/
├── src/                    ← React web app (Vite)
│   ├── features/           ← Feature-sliced modules
│   │   ├── player/         ← Audio player (Howler.js)
│   │   ├── search/         ← YT Music search
│   │   ├── library/        ← Playlists, liked songs
│   │   ├── auth/           ← Supabase auth (Google OAuth)
│   │   ├── panda/          ← Pandoos-unique panda features
│   │   ├── album/          ← Album pages
│   │   ├── artist/         ← Artist pages
│   │   ├── onboarding/     ← First-run flow
│   │   └── profile/        ← User profile
│   ├── services/           ← Core services
│   │   ├── supabase.ts     ← Supabase client init
│   │   ├── youtube.ts      ← YT Music API wrapper
│   │   ├── library.ts      ← Liked songs, playlists CRUD
│   │   ├── syncService.ts  ← Cross-device sync logic
│   │   ├── nowPlayingSync.ts ← Realtime now_playing table
│   │   ├── recommendEngine.ts ← Track graph recommendations
│   │   ├── trackGraph.ts   ← Music relationship graph
│   │   ├── lyrics.ts       ← LRCLIB lyrics fetching
│   │   ├── color.ts        ← Album art color extraction (node-vibrant)
│   │   ├── cache.ts        ← IDB-keyval caching layer
│   │   └── offlineDB.ts    ← IndexedDB offline storage
│   ├── types/
│   │   ├── track.ts        ← Track, Artist, SearchResult interfaces
│   │   ├── user.ts         ← PandoosUser, AuthState
│   │   └── playlist.ts     ← Playlist types
│   ├── components/         ← Shared UI components
│   ├── hooks/              ← Custom React hooks
│   ├── pages/              ← Route-level pages
│   └── utils/              ← Pure utility functions
├── electron/               ← Electron desktop shell
├── api/                    ← Vercel Edge Functions (serverless)
├── packages/
│   └── shared/             ← Shared TS types/stores (workspace package)
│       └── src/stores/     ← Zustand stores used across packages
├── public/                 ← Static assets
├── SUPABASE_SETUP_FINAL.sql ← AUTHORITATIVE DB schema — always reference this
└── .env.example            ← All required environment variables
```

---

## 🔑 Environment Variables

```env
VITE_SUPABASE_URL=             # Supabase project URL
VITE_SUPABASE_ANON_KEY=        # Supabase anon public key
VITE_GOOGLE_CLIENT_ID=529626065517-rvrjir6ugvkred5ln3vuev30lfnfnsth.apps.googleusercontent.com
YOUTUBE_API_KEY=               # YouTube Data API v3 (server-side only, Vercel Edge)
UPSTASH_REDIS_REST_URL=        # Upstash Redis (search cache)
UPSTASH_REDIS_REST_TOKEN=      # Upstash Redis token
```

Never expose `YOUTUBE_API_KEY` to the browser. It only runs in `api/` Edge Functions.

---

## 🗄️ Supabase Database Schema (AUTHORITATIVE)

Source of truth: `SUPABASE_SETUP_FINAL.sql`

### Tables

#### `liked_songs`
```sql
id        uuid  PK
user_id   text  (Supabase auth user ID)
video_id  text  (YouTube videoId)
title     text
artist    text
album_art text
duration  integer (seconds)
liked_at  timestamptz
UNIQUE(user_id, video_id)
```

#### `playlists`
```sql
id          uuid  PK
user_id     text
name        text
description text
cover_url   text
is_public   boolean
track_count integer  (auto-updated by trigger)
created_at  timestamptz
updated_at  timestamptz
```

#### `playlist_tracks`
```sql
id          uuid  PK
playlist_id uuid  FK → playlists(id) CASCADE
video_id    text
title       text
artist      text
album_art   text
duration    integer
position    bigint  (ordering)
added_at    timestamptz
```

#### `followed_artists`
```sql
id            uuid  PK
user_id       text
artist_id     text  (YTM browseId)
name          text
thumbnail_url text
followed_at   timestamptz
UNIQUE(user_id, artist_id)
```

#### `now_playing` (Cross-device realtime sync)
```sql
user_id     text  PK  (one row per user, upserted)
video_id    text
title       text
artist      text
album_art   text
is_playing  boolean
progress    float  (0.0 – 1.0)
device_name text   ("Web" | "Desktop" | "Android")
updated_at  timestamptz
```

**Realtime enabled** on all tables via `supabase_realtime` publication.

---

## 🎵 Core TypeScript Types

### Track (the fundamental entity)
```typescript
interface Track {
  readonly id: string;         // equals videoId for YouTube
  readonly title: string;
  readonly artist: string;
  readonly albumArt: string;
  readonly duration: number;   // seconds
  readonly videoId: string;    // YouTube video ID
  readonly source: 'youtube';
  readonly channelTitle?: string;
  readonly artistId?: string;  // YTM browseId
  readonly albumId?: string;   // YTM browseId
}
```

### PandoosUser
```typescript
interface PandoosUser {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
}
```

---

## 🧰 Tech Stack — Web + Desktop

| Layer | Technology |
|---|---|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Desktop Shell | Electron 42 |
| Styling | Tailwind CSS 3 + custom CSS |
| Animations | Framer Motion + GSAP |
| State Management | Zustand 5 |
| Server State | TanStack Query v5 |
| Audio (web) | Howler.js |
| Audio (desktop) | ytdl-core via Electron IPC |
| YT Music API | ytmusic-api + InnerTube private API |
| Backend / DB | Supabase (Postgres + Auth + Realtime) |
| Search Cache | Upstash Redis (via Vercel Edge) |
| Auth | Google OAuth via @react-oauth/google + Supabase |
| Forms | React Hook Form + Zod |
| Routing | React Router DOM v7 |
| Color Extraction | node-vibrant |
| Icons | Lucide React |

---

## 📱 ANDROID REPO — `pandoos-android/`

> Located at: `C:\Users\rajva\OneDrive\Desktop\pandoos-android\` (separate repo)
> GitHub: `github.com/Rajvansh-1/pandoos-android`
> Base: Fork of SimpMusic (maxrave-dev/SimpMusic) — GPL-3.0 licensed

### Android Tech Stack
| Layer | Technology |
|---|---|
| Language | Kotlin |
| UI | Jetpack Compose + Material3 |
| Audio Engine | ExoPlayer / Media3 (from SimpMusic — DO NOT REWRITE) |
| Background Audio | MediaSessionService (from SimpMusic — DO NOT REWRITE) |
| YT Music API | InnerTube (from SimpMusic — DO NOT REWRITE) |
| State | ViewModel + StateFlow + Hilt DI |
| Local DB | Room (from SimpMusic) |
| Cloud Backend | Supabase Android SDK (NEW — Pandoos addition) |
| HTTP | Ktor |
| Preferences | DataStore |
| App ID | `com.pandoos.music` |

### What's from SimpMusic (Keep As-Is)
- `ExoPlayer` / Media3 setup
- `MediaSessionService` — background playback, lock screen, notification
- `InnerTube.kt` — YouTube Music API calls
- `DownloadUtils.kt` — offline song caching
- `LyricsManager.kt` — LRC sync
- `QueueManager.kt` — queue logic
- `Room DB` entities (extend, don't replace)

### What's Pandoos-Added (New Code)
- `SupabaseClient.kt` — connects to same Supabase project as web
- `AuthRepository.kt` — Google OAuth via Supabase
- `PlaylistRepository.kt` — CRUD to `playlists` + `playlist_tracks` tables
- `SyncRepository.kt` — `now_playing` cross-device sync
- Pandoos Material3 theme (purple/dark palette)
- Panda mascot branding + icons
- Mood/emotion playlist UI
- Smart Queue logic

---

## 🔄 Cross-Platform Sync Architecture

```
All platforms share ONE Supabase project.
The `now_playing` table is the cross-device bridge.

Android writes:  device_name = "Android"
Web writes:      device_name = "Web"
Desktop writes:  device_name = "Desktop"

Realtime subscriptions let each platform instantly see
what's playing on another device.

"Continue Listening" feature:
→ User opens Android after using Web
→ App reads last `now_playing` row for this user_id
→ Offers to resume at exact progress
```

### Supabase Realtime Tables (all enabled)
- `liked_songs` — heart a song on any device, syncs instantly
- `playlists` — create on web, appears on Android
- `playlist_tracks` — add track anywhere, shows everywhere
- `followed_artists` — follow on Android, reflects on web
- `now_playing` — real-time cross-device playback sync

---

## 🐼 Pandoos Identity & Design Language

### Brand
- **Name**: Pandoos
- **Mascot**: Panda (emotional, animated)
- **Tagline**: Feel the music
- **App ID (Android)**: `com.pandoos.music`
- **App ID (Web/Electron)**: `com.pandoos.music`

### Color Palette
```
Primary:    #9C6ADE  (purple)
Secondary:  #FF6B9D  (pink accent)
Background: #0A0A0F  (near-black)
Surface:    #13111C  (dark purple-tinted)
Text:       #F0EEFF  (off-white purple tint)
Accent:     #7B5EA7  (muted purple)
Error:      #FF5370  (red-pink)
```

### Pandoos-Unique Features (across all platforms)
1. **Panda Emotions / Moods** — Mood-based playlist curation with panda reactions
2. **Cross-Platform Continue** — Resume on Android what you started on Desktop
3. **Smart Queue** — AI-assisted queue based on energy, time of day, history
4. **Pandoos Wrapped** — Monthly stats from `now_playing` + `liked_songs` history
5. **Panda Now Playing** — Animated panda mascot reacts to music energy
6. **Sleep Experience** — Gradual tempo wind-down + morning wake playlists
7. **Track Graph** — Music relationship graph powering recommendations (`trackGraph.ts`)

---

## ⚠️ Critical Rules — Always Follow

1. **Audio source is YouTube Music only** — `videoId` is the universal song ID across all platforms
2. **Never expose `YOUTUBE_API_KEY` client-side** — server/edge functions only
3. **`SUPABASE_SETUP_FINAL.sql` is the schema authority** — always match its table/column names exactly
4. **`user_id` in all DB tables = Supabase auth user UUID** (text type)
5. **`video_id` = YouTube videoId** — the universal key linking web, desktop, and Android
6. **Don't touch SimpMusic's audio engine in pandoos-android** — ExoPlayer/Media3/InnerTube are production-tested
7. **GPL-3.0 compliance** — pandoos-android must remain open source; LICENSE file must stay
8. **`now_playing` table uses UPSERT** — one row per user, not insert
9. **`position` in `playlist_tracks` is a bigint** — use for ordering, not array index
10. **Supabase RLS is disabled** — using user_id filtering in queries instead

---

## 🚀 Running the Projects

### Web (browser dev server)
```powershell
cd C:\Users\rajva\OneDrive\Desktop\pandoos
npm run dev
# Opens at http://localhost:5173
```

### Desktop (Electron)
```powershell
cd C:\Users\rajva\OneDrive\Desktop\pandoos
npm run dev
# Vite dev server + Electron window launch together
```

### Android
```powershell
cd C:\Users\rajva\OneDrive\Desktop\pandoos-android
# Open in Android Studio → Run on device/emulator
# OR: ./gradlew installDebug
```

---

## 📦 Key NPM Scripts (pandoos/)

```json
"dev"      → Vite dev server (web)
"build"    → TypeScript compile + Vite build
"dist"     → Full Electron production build (Win/Mac/Linux)
"dist:win" → Windows installer (.exe + portable)
```

---

## 🔗 External Services

| Service | Purpose | Where configured |
|---|---|---|
| Supabase | Auth, DB, Realtime | `.env.local` |
| Google Cloud Console | OAuth Client ID + YouTube API | `.env.local` |
| Upstash Redis | Search result caching | `.env.local` |
| LRCLIB | Lyrics (free, no key needed) | `services/lyrics.ts` |
| GitHub Actions | CI/CD + Electron releases | `.github/` |

---

## 📁 File You Should Read Before Major Changes

| Task | Read First |
|---|---|
| Supabase DB changes | `SUPABASE_SETUP_FINAL.sql` |
| Adding a new feature | `src/features/` — match existing pattern |
| Adding a service | `src/services/` — check if one exists |
| Type definitions | `src/types/track.ts`, `src/types/user.ts` |
| Android Supabase sync | `pandoos_android_masterplan.md` (in AI artifacts) |
| Architecture decisions | `pandoos_mobile_architecture.md` (in AI artifacts) |
