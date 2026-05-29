# 🐼 Pandoos Ecosystem — Production Launch Plan

The plan to transform Pandoos from a strong MVP into a production-ready, Spotify-competitive music ecosystem across Web, Desktop, and Mobile.

---

## User Review Required

> [!IMPORTANT]
> **Mobile Strategy: PWA over Capacitor**  
> After analyzing your Capacitor setup, I strongly recommend **dropping Capacitor entirely** and going **PWA-first for mobile**. Here's why:
> - Capacitor wraps your web app in a WebView — it's fundamentally still a web app, but with the overhead of native builds, Play Store approval delays, and debugging complexity
> - Your **audio playback uses Howler.js** (Web Audio API) — Capacitor doesn't give you native audio advantages
> - You already have a **separate Kotlin-native Android app** (`pandoos-android`) using ExoPlayer/Media3 — that's your real native experience
> - PWA gives you: installable home screen icon, offline capability, background audio (with Media Session API you already use), push notifications, and **instant updates** without Play Store review
> - Your `vite-plugin-pwa` is already in devDependencies — you just need to configure it

> [!IMPORTANT]  
> **New Supabase Tables Required**  
> This plan requires 2 new Supabase tables: `listening_history` and `user_taste_profile`. I'll provide the SQL. You'll need to run it in your Supabase dashboard.

> [!WARNING]
> **Scope Warning**: This is a massive 8-phase plan. I recommend we execute in priority order. Each phase is independently deployable. Which phases do you want to prioritize first?

---

## Open Questions

> [!IMPORTANT]
> 1. **Musixmatch API**: SimpMusic uses Musixmatch for premium lyrics. Do you have a Musixmatch API key, or should we stick with LRCLIB + YouTube Transcript + community lyrics?
> 2. **Weather API**: Your `useWeatherContext` is working — which weather API are you using? (Need to know for the recommendation engine's weather signals)
> 3. **Listening History Storage**: Currently your `useTasteStore` uses localStorage. For cross-device recommendations, should we also persist taste profiles to Supabase? (Recommended YES)
> 4. **PWA Name**: Should the installable PWA be called "Pandoos" or "Pandoos Music" on the home screen?

---

## Phase 1 — Mobile Strategy: PWA (Drop Capacitor)

Ultra-fast mobile experience with the same Panda UI, installable from browser, no app store needed.

### Why PWA wins for Pandoos:
| Factor | Capacitor | PWA |
|---|---|---|
| Update speed | Play Store review (days) | Instant (next visit) |
| Install friction | Download from store | "Add to Home Screen" prompt |
| Audio background | WebView limitations | Media Session API ✅ |
| Performance | WebView overhead | Direct browser engine |
| Bundle size | APK ~40MB+ | Cached ~5MB |
| Your native app | Conflicts with pandoos-android | Complements it |

---

#### [MODIFY] [vite.config.ts](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/vite.config.ts)
- Configure `vite-plugin-pwa` with proper manifest, service worker (Workbox), offline caching strategies
- Cache audio stream URLs, API responses, and static assets aggressively
- Add `manifest.webmanifest` generation with Pandoos branding, icons, theme colors

#### [NEW] `public/manifest.webmanifest`  
- App name: "Pandoos Music", short_name: "Pandoos"
- theme_color: `#0A0A0F`, background_color: `#0A0A0F`
- display: `standalone`, orientation: `portrait`
- Icons: 192x192, 512x512, maskable variants

#### [MODIFY] [index.html](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/index.html)
- Add PWA meta tags, apple-mobile-web-app-capable, apple-touch-icon
- Add theme-color meta for mobile browser chrome color

#### [NEW] `src/components/pwa/InstallPrompt.tsx`
- Detect `beforeinstallprompt` event
- Show a beautiful Panda-themed install banner for mobile users
- Persist dismiss state so it doesn't nag

#### [DELETE] Remove Capacitor-specific code
- Remove `useCapacitorNative.ts` hook (replaced by PWA APIs)
- Remove Capacitor imports from `nowPlayingSync.ts` (`@capacitor/device`)
- Remove `capacitor.config.ts`, `android/`, `ios/` directories
- Remove `@capacitor/*` packages from `package.json`
- Keep `.env.native` and `build:native` script only if you want to maintain the Capacitor path for pandoos-android WebView embedding (unlikely since you have native Kotlin)

---

## Phase 2 — Hyper-Personalized Recommendation Engine

Complete overhaul of the home page to be **fully dynamic**, changing based on listening habits, mood, taste, weather, time of day, and demographics.

### Architecture: The "Pandoos Brain"

```
┌─────────────────────────────────────────────────────────┐
│                    PANDOOS BRAIN                         │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Listening │ │ Weather  │ │  Time    │ │ Taste    │  │
│  │ History   │ │(Supabase) │ │(API)     │ │(local)   │  │
│  │(Supabase) │ │(API)     │ │(local)   │ │(Zustand) │  │
│  └─────┬─────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘  │
│        │              │            │             │        │
│        └──────────────┴────────────┴─────────────┘        │
│                         │                                 │
│                 ┌───────▼──────────┐                     │
│                 │ Context Scorer   │                     │
│                 │ (Weighted Signals)│                     │
│                 └───────┬──────────┘                     │
│                         │                                 │
│           ┌─────────────┴──────────────┐                 │
│           ▼                            ▼                 │
│    ┌─────────────┐          ┌──────────────┐            │
│    │ Section     │          │ Song Ranking  │            │
│    │ Ordering    │          │ & Dedup       │            │
│    └─────────────┘          └──────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### New Supabase Table: `listening_history`

```sql
create table if not exists listening_history (
  id         uuid default gen_random_uuid() primary key,
  user_id    text not null,
  video_id   text not null,
  title      text not null,
  artist     text not null,
  album_art  text,
  duration   integer default 0,
  listen_pct float default 0,    -- 0.0 to 1.0 (how much was listened)
  skipped    boolean default false,
  mood_tag   text,               -- mood at time of listen
  hour_of_day integer,           -- 0-23
  day_of_week integer,           -- 0-6 (Sun=0)
  listened_at timestamptz default now()
);

create index on listening_history(user_id, listened_at desc);
alter table listening_history disable row level security;
alter publication supabase_realtime add table listening_history;
```

### New Supabase Table: `user_taste_profile`

```sql
create table if not exists user_taste_profile (
  user_id        text primary key,
  top_genres     text[] default '{}',
  top_artists    text[] default '{}',
  top_moods      text[] default '{}',
  avg_energy     float default 0.5,
  preferred_lang text default 'mixed',
  listen_count   integer default 0,
  updated_at     timestamptz default now()
);

alter table user_taste_profile disable row level security;
```

---

#### [NEW] `src/services/pandoosBrain.ts`
The central recommendation brain. Core responsibilities:
- **Context Collection**: Gather all signals (time, weather, taste profile, recent history, day of week)
- **Section Generator**: Dynamically generate home page sections based on context (not hardcoded)
  - Morning → "Wake Up Vibes", "Coffee & Acoustics"
  - Late night → "Night Drive", "Synthwave Session"
  - Raining → "Rainy Day Lo-Fi", "Acoustic Rain"
  - After gym (frequent workout mood) → "Post-Workout Chill"
- **Query Builder**: Generate contextual search queries instead of static ones
- **Deduplication Engine**: Global dedup across ALL sections (your current dedup only works per-lane)
- **Freshness Score**: Penalize songs heard in last 24h, boost songs never heard
- **Diversity Enforcer**: Ensure no artist appears more than 2x across all sections

#### [MODIFY] [recommendEngine.ts](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/services/recommendEngine.ts)
- Add `recordListenEvent()` — writes to `listening_history` table on every track completion/skip
- Add `buildTasteProfile()` — aggregates listening_history into user_taste_profile
- Replace `rankOracleVibes` with the new `PandoosBrain.rankSections()` that uses ALL signals
- Add time-decay scoring (recent listens weighted 3x more than old ones)

#### [MODIFY] [HomePage.tsx](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/pages/HomePage.tsx)
Major rewrite:
- **Remove hardcoded sections** (The Bollywood Gala, The Desi Gully, etc.)
- **Replace with dynamically generated sections** from PandoosBrain
- Each section's query, title, and emoji are generated contextually
- Sections reorder every time context changes (time, weather, mood selection)
- Add section type: "Because You Listened to [X]" based on last 5 unique artists
- Add section type: "Your [Time] Mix" (Morning Mix, Night Mix, etc.)
- Add section type: "Missed Hits" — popular tracks from liked genres never played

#### [MODIFY] [useTasteStore.ts](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/packages/shared/src/stores/useTasteStore.ts)
- Sync taste profile to Supabase `user_taste_profile` table
- Add `refreshFromCloud()` for cross-device taste sync
- Track `listenCounts` by genre, artist, and mood for weighting

---

## Phase 3 — No Repetition + Endless "+More"

### Problem Analysis:
1. **"Jump Back In" repeats songs** because `history` in player store doesn't deduplicate
2. **"+More" button is finite** — it only paginates existing search results, doesn't fetch new ones

---

#### [MODIFY] [HomePage.tsx](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/pages/HomePage.tsx)
- **Jump Back In**: Deduplicate history by `videoId` BEFORE slicing
- **Global Dedup**: Maintain a single `Set<videoId>` across ALL sections — no song appears in two sections
- **Infinite "+More"**: Instead of paginating a fixed array, the "+More" button should:
  1. Generate a NEW search query variation (add randomness seed, change keywords)
  2. Fetch fresh results from `/api/search`
  3. Filter out already-shown `videoId`s
  4. Append to the section infinitely
  5. Show a loading spinner while fetching
- **No visible end**: The "+More" card always appears unless search API returns 0 new results

#### [NEW] `src/hooks/useInfiniteSection.ts`
- Custom hook wrapping `useInfiniteQuery` from TanStack Query
- Generates progressively different search queries per page
- Guarantees no duplicates across all loaded pages
- Returns `{ tracks, hasMore, loadMore, isLoadingMore }`

---

## Phase 4 — SimpMusic-Inspired Lyrics System

### Current Problems:
1. Lyrics loading is slow (waterfall of 5 serial requests)
2. No lyrics provider choice
3. Mobile: lyrics are embedded in the "Up Next" tab area — not a proper fullscreen experience
4. Desktop: lyrics are buried below the fold, you can't scroll back up to controls

### SimpMusic Lyrics Architecture (what we'll adopt):

| Feature | SimpMusic | Pandoos (Current) | Pandoos (New) |
|---|---|---|---|
| Providers | LRCLIB, Musixmatch, YouTube Transcript, Community | LRCLIB only | LRCLIB + YouTube Transcript + Community (Musixmatch if key available) |
| Provider switching | ✅ User can choose | ❌ | ✅ Dropdown in lyrics view |
| Parallel fetch | ✅ All providers at once | ❌ Serial waterfall | ✅ `Promise.allSettled` |
| Caching | ✅ Room DB | ❌ No cache | ✅ IDB-keyval cache |
| Mobile fullscreen | ✅ Dedicated lyrics screen | ❌ Small embedded view | ✅ Spotify-style fullscreen |
| Desktop view | ✅ Side panel | ❌ Scroll-buried | ✅ Tab next to "Up Next" |
| Synced line highlight | ✅ | ✅ (good) | ✅ (keep, it's already great) |
| Click-to-seek | ✅ | ✅ | ✅ |
| Translation | ✅ (AI) | ❌ | 📅 Future |

---

#### [MODIFY] [lyrics.ts](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/services/lyrics.ts)
**Complete rewrite** for multi-provider parallel fetching:

```typescript
interface LyricsProvider {
  id: 'lrclib' | 'youtube' | 'community';
  name: string;
  fetch: (title: string, artist: string, videoId?: string) => Promise<LyricsResult>;
}

async function fetchAllProviders(title, artist, videoId): Promise<Map<string, LyricsResult>> {
  const results = await Promise.allSettled([
    fetchFromLRCLIB(title, artist),           // ~200ms
    fetchFromYouTubeTranscript(videoId),       // ~300ms via /api/lyrics
    fetchFromCommunityDB(title, artist),       // ~100ms (new community endpoint)
  ]);
  // Return all successful results keyed by provider
  // User can switch between them
}
```

- **Parallel fetching**: All providers fetched simultaneously via `Promise.allSettled`
- **IDB caching**: Cache results in IndexedDB (`idb-keyval`) keyed by `videoId`
  - Cache hit = **instant** lyrics display (0ms)
  - Cache miss = parallel fetch (~200-300ms vs current ~800-2000ms)
- **Provider preference**: Store user's preferred provider in `useSettingsStore`
- **Auto-select best**: Default to synced lyrics if available, then plain

#### [NEW] `src/services/lyricsCache.ts`
- Uses `idb-keyval` (already in deps) for persistent lyrics cache
- Key: `lyrics_${videoId}`
- Value: `Map<providerId, LyricsResult>`
- TTL: 7 days (lyrics don't change often)
- Prefetch: When a track starts playing, also prefetch lyrics for the NEXT track in queue

#### [MODIFY] [LyricsView.tsx](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/features/player/components/LyricsView.tsx)
- Add provider selector dropdown (small, elegant, top-right corner)
- Show provider name badge on current lyrics
- Keep existing rAF-based sync (it's already excellent)
- Add "No lyrics from this provider" state with "Try another" button

#### [NEW] `src/features/player/components/MobileLyricsScreen.tsx`
**Spotify-style fullscreen lyrics for mobile:**
- Full-screen overlay with album art blurred background
- Large, centered synced lyrics with Apple Music-style transitions
- Swipe down to dismiss
- Mini controls at bottom (play/pause, skip, seekbar)
- Provider switcher accessible via small gear icon
- Tap any line to seek
- Smooth auto-scroll with spring physics

#### [MODIFY] [FullscreenPlayer.tsx](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/features/player/components/FullscreenPlayer.tsx)

**Mobile changes:**
- Add "Lyrics" button on the main player screen (like Spotify's lyrics button)
- Tapping it opens the new `MobileLyricsScreen` as a fullscreen overlay
- Remove lyrics from the tab bar area — it's now its own screen

**Desktop changes (THE BIG FIX):**
- **Replace the current scroll-based layout** with a **tabbed layout** for the left column
- Tabs: `Player` | `Lyrics` | visible at the top of the left column
- `Player` tab: Vinyl/Panda + Track Info + Controls (what's currently the top)
- `Lyrics` tab: Full-height lyrics view with provider selector
- This completely fixes the "can't scroll back to top" issue — no scrolling needed
- Right column stays: "Up Next" queue (unchanged)

---

## Phase 5 — Beast-Level Cross-Device Sync

### Current State vs. Target (Spotify-Level)

| Feature | Current | Target |
|---|---|---|
| Now Playing sync | ✅ 5s interval | ✅ 2s interval + instant on change |
| Liked Songs sync | ✅ Realtime | ✅ Keep |
| Playlist sync | ✅ Realtime | ✅ Keep |
| Queue sync | ❌ | ✅ Share queue across devices |
| Resume playback | ❌ Partial | ✅ Spotify-style "Continue on this device" |
| Listening history sync | ❌ localStorage only | ✅ Supabase + cross-device |
| Taste profile sync | ❌ localStorage only | ✅ Supabase |
| Active device indicator | ❌ | ✅ Show which device is playing |
| Device transfer | ❌ | ✅ "Play on this device" button |

---

#### [MODIFY] [nowPlayingSync.ts](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/services/nowPlayingSync.ts)
- **Reduce write interval** from 5s → 2s for more responsive sync
- **Instant write** on play/pause/skip events (don't wait for interval)
- Remove `@capacitor/device` import — use `navigator.userAgent` parsing instead
- Add `duration` field to `now_playing` writes (currently 0 in received tracks)
- Add queue sync: write `queue_video_ids` (top 20 upcoming videoIds) to now_playing row

#### [NEW] `src/components/sync/DeviceTransferBanner.tsx`
Spotify-style "Continue Listening" banner:
- Shows when another device was playing within last 5 minutes
- "Listening on [Device Name] — [Track Title]"
- "TRANSFER TO THIS DEVICE" button
- Beautiful slide-down animation, auto-dismisses after 10s
- Shows in home page header area

#### [MODIFY] [syncService.ts](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/services/syncService.ts)
- Subscribe to `listening_history` changes for cross-device taste sync
- Subscribe to `user_taste_profile` changes
- Add reconnection logic with exponential backoff

---

## Phase 6 — Production-Ready Library

### Current Issues:
- Library works but some edge cases: no "recently played" section, no sorting/filtering
- Playlist page needs polish — can't reorder tracks, no shuffle button
- No "add to playlist" from any track context menu

---

#### [MODIFY] [LibraryPage.tsx](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/pages/LibraryPage.tsx)
- Add **"Recently Played"** section at top (from `listening_history` table)
- Add **sort options** for playlists: Recent, A-Z, Most tracks
- Add **filter chips**: All, Playlists, Artists, Downloaded
- Make liked songs card show actual count dynamically
- Add **"Downloads"** section for offline cached tracks

#### [MODIFY] [PlaylistPage.tsx](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/pages/PlaylistPage.tsx)
- Add **shuffle play** button (large, prominent)
- Add **drag-to-reorder** tracks (using Framer Motion Reorder like queue)
- Add **search within playlist** for large playlists
- Add **playlist description editing**
- Add **playlist cover from first 4 track arts** (auto-generated mosaic)
- Fix: show **total duration** of playlist

#### [NEW] `src/components/shared/AddToPlaylistModal.tsx`
- Reusable modal for adding any track to any playlist
- Shows all user playlists with checkmarks for already-added
- "Create New Playlist" option at top
- Connected to `PlayerOptionsModal` and track context menus everywhere

#### [MODIFY] [PlayerOptionsModal.tsx](file:///c:/Users/rajva/OneDrive/Desktop/pandoos/src/features/player/components/PlayerOptionsModal.tsx)
- Add "Add to Playlist" option that opens `AddToPlaylistModal`
- Add "Go to Artist" option
- Add "Go to Album" option
- Add "Share" option (copy link / Web Share API)

---

## Phase 7 — Features from SimpMusic to Adopt

After analyzing SimpMusic's feature set, here are the **essential features** to bring to Pandoos web/desktop:

### Must-Have (Include in this launch)

| Feature | SimpMusic Implementation | Pandoos Adaptation |
|---|---|---|
| **YouTube Music Radio** | InnerTube `watch_playlist` | ✅ Already have `/api/radio` endpoint |
| **Sleep Timer** | Built-in timer with fade | ✅ Already in PlayerOptionsModal |
| **Lyrics Provider Switch** | Multiple sources UI | 🔧 Phase 4 above |
| **Queue Management** | Drag reorder, clear | ✅ Already have drag reorder |
| **Download for Offline** | ExoPlayer cache | 🔧 Use Service Worker cache + IDB |
| **Equalizer** | Android AudioEffect | 🔧 Web Audio API EQ (5-band) |
| **Playback Speed** | ExoPlayer setSpeed | 🔧 Howler.js rate() control |
| **Canvas/Video BG** | YouTube Music canvas art | 🔧 Animated album art background |

### Nice-to-Have (Post-launch)

| Feature | Notes |
|---|---|
| AI Lyrics Translation | Requires OpenAI/Gemini key |
| Local music playback | File input + Web Audio |
| Spotify import | Spotify API for playlist migration |
| Discord Rich Presence | Desktop only, Electron IPC |
| Scrobbling | Last.fm API integration |

---

#### [NEW] `src/features/player/components/EqualizerModal.tsx`
- 5-band EQ using Web Audio API `BiquadFilterNode`
- Presets: Flat, Bass Boost, Vocal, Rock, Electronic, Acoustic
- Custom sliders for manual adjustment
- Persist settings in `useSettingsStore`

#### [NEW] `src/features/player/components/PlaybackSpeedControl.tsx`
- Speed options: 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x
- Accessible from PlayerOptionsModal
- Uses Howler.js `rate()` method

#### [MODIFY] `usePlayerStore.ts`
- Add `playbackSpeed` state + `setPlaybackSpeed` action
- Apply speed to Howler instance on change
- Add equalizer integration hooks

---

## Phase 8 — Final Release Preparation

### Web (Vercel)
- Enable PWA with proper service worker
- Add proper error boundaries for every route
- Performance audit: Lighthouse score ≥ 90
- Add `robots.txt`, `sitemap.xml`
- Add Open Graph meta tags for sharing

### Desktop (Electron)
- Update version to `2.0.0` for stable release
- Sign with code signing certificate (Windows/Mac)
- Auto-updater via electron-updater (already configured)
- Test offline mode

### Cross-Platform
- Verify Supabase Realtime across all platforms
- Load test with simultaneous web + desktop + Android connections
- Verify taste profile syncs correctly between devices
