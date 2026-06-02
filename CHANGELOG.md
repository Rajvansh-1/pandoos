# Changelog

All notable changes to Pandoos are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.1.2] - 2026-06-02 🍏 macOS CI Build Fix

### Fix
- Fixed a bug in the GitHub Actions `release.yml` workflow where an empty `CSC_LINK` (code signing certificate) secret was causing the macOS `electron-builder` job to fail. It was interpreting the empty string as a directory path, resulting in the `/Users/runner/work/pandoos/pandoos not a file` error.

---

## [3.1.1] - 2026-06-02 🚑 UI Data Shape Hotfix

### What Broke
- In v3.1.0, the **Artist** and **Album** pages stopped rendering their content correctly (missing titles, missing albums, missing "Fans Also Like" section). 
- The new `youtubei.js` adapter returned a completely different data shape than what the React UI components (`ArtistOverlay.tsx` and `AlbumOverlay.tsx`) were strictly typed to expect.

### Fix
- **Reverted `api/artist.ts` and `api/album.ts`** to use the original `ytmusic-api` package.
- Because `ytmusic-api` was successfully patched in v3.1.0 using a RegEx fallback (via `patch-package`), it can now successfully extract video IDs without failing. By reverting back to it, we restore the exact complex data structures (topAlbums, topSingles, similarArtists, etc.) that the frontend expects, instantly fixing the UI rendering.
- Bumped cache keys to `v5` to clear out the badly-shaped `v3.1.0` cached data.

---

## [3.1.0] - 2026-06-02 🛡️ Resilience Update

### 🔴 Critical Fix — YouTube Music API (all users affected on v3.0.8)

YouTube silently restructured their private InnerTube API response between June 1–2 2026.
The `playlistItemData.videoId` field was removed from search results and moved to a nested
location inside the `overlay` content object. This caused **every song returned by search**
to have an empty `videoId`, breaking album art, playback, and React rendering on all platforms.

### What Broke
- 🖼️ All song thumbnails / album art showed as broken images
- ▶️ No songs could play — audio fetch failed with empty videoId
- ⚛️ React internal error `Expected static flag was missing` spammed the console
- 🏠 Home screen (Oracle, Trending) showed empty/broken cards

### Root Cause
`ytmusic-api@5.3.1` uses hard-coded paths like `traverseString(item, "playlistItemData", "videoId")`.
When YouTube removed that key, the result was `""` for every song.

### Fix
- **NEW** `api/ytmusic-adapter.ts` — A dedicated YouTube Music adapter built directly on
  `youtubei.js` (a lower-level, more actively maintained InnerTube client). All API handlers
  now import from this single file.
- **5-layer fallback chain** for `videoId` extraction — YouTube would need to remove the ID
  from *all* five possible locations simultaneously for the extraction to fail. This is
  essentially impossible since the ID must exist somewhere for playback to work.
- **`patch-package` safety net** — The fix is also backported to `ytmusic-api`'s `SongParser`
  via a committed patch file that auto-applies on `npm install`.
- **Redis cache keys bumped** — All stale cached responses with empty videoIds are
  automatically bypassed by the new v4/v5 cache key versions.

### New Features
- ✨ **In-app update banner** — When a new version is available, a beautiful non-intrusive
  banner slides in at the top of the screen. Shows three states: "downloading", "ready", and
  a "Restart Now" button. No more jarring native OS dialogs.

### Files Changed
```
api/ytmusic-adapter.ts  [NEW] — Single source of truth for all YT Music API calls
api/search.ts           — Now uses adapter (cache key: v5)
api/oracle.ts           — Now uses adapter
api/trending.ts         — Now uses adapter (cache key: v4)
api/radio.ts            — Now uses adapter (cache key: v4)
api/artist.ts           — Now uses adapter (cache key: v4)
api/album.ts            — Now uses adapter (cache key: v4)
electron/main.ts        — Granular update events (available/downloading/ready)
electron/preload.cjs    — Exposed update IPC channels to renderer
src/components/shared/UpdateBanner.tsx  [NEW] — In-app update notification UI
src/components/layout/DesktopLayout.tsx — Mounts UpdateBanner
patches/ytmusic-api+5.3.1.patch         — Clean fallback patch for ytmusic-api
```

---

## [3.0.8] - Previous Release

- Initial stable release with Supabase sync, YT Music playback, Oracle vibes, etc.
